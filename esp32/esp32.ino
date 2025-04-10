#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// 📡 WiFi 설정
const char* ssid = "TP-LINK_43B2";
const char* password = "41151501";

// 🌐 서버 설정
const char* serverUrl = "https://project1-production-f338.up.railway.app";
const char* deviceId = "ESP32_001";
const char* deviceSecret = "esp32-secret-key";

// 📍 핀 설정
const int closePin = 25;   // 닫힘 신호 핀

// 상태 변수
String lastCommand = "";    // 마지막으로 실행한 명령을 저장
unsigned long lastCheck = 0;
const unsigned long interval = 1000;  // 1초마다 서버 확인

// SSL 클라이언트
WiFiClientSecure client;

void setup() {
  Serial.begin(115200);
  
  // GPIO 설정 - 초기 상태를 LOW(0V)로 설정
  pinMode(closePin, OUTPUT);
  digitalWrite(closePin, LOW);
  
  // SSL 인증서 검증 비활성화
  client.setInsecure();
  
  // WiFi 연결
  WiFi.begin(ssid, password);
  Serial.print("WiFi 연결 중");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi 연결됨");
}

void loop() {
  // WiFi 연결 확인
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi 재연결..");
    WiFi.reconnect();
    return;
  }
  
  // 일정 간격으로 서버 확인
  unsigned long currentMillis = millis();
  if (currentMillis - lastCheck >= interval) {
    lastCheck = currentMillis;
    checkServer();
  }
}

void checkServer() {
  HTTPClient https;
  String url = String(serverUrl) + "/api/device/command/" + deviceId;

  if (https.begin(client, url)) {
    https.addHeader("Authorization", deviceSecret);
    https.addHeader("Content-Type", "application/json");

    int httpCode = https.GET();
    String payload = https.getString();

    if (httpCode == 200) {
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.println("JSON 파싱 오류");
        https.end();
        return;
      }

      const char* command = doc["command"];
      if (!command) {
        https.end();
        return;
      }

      // 이전 명령과 다를 때만 실행
      if (strcmp(command, lastCommand.c_str()) != 0) {
        lastCommand = String(command);  // 현재 명령을 저장
        
        if (strcmp(command, "close") == 0) {
          Serial.println("새로운 닫힘 명령 실행");
          controlBarrier();
          notifyStatus("closed");
        }
      }
    }
  }
  https.end();
}

void notifyStatus(const char* status) {
  HTTPClient https;
  String url = String(serverUrl) + "/api/device/status/" + deviceId;

  if (https.begin(client, url)) {
    https.addHeader("Authorization", deviceSecret);
    https.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    doc["status"] = status;
    doc["timestamp"] = millis();

    String jsonString;
    serializeJson(doc, jsonString);

    int httpCode = https.POST(jsonString);
    
    if (httpCode == 200) {
      Serial.println("상태 업데이트 완료");
    }
  }
  https.end();
}

void controlBarrier() {
  digitalWrite(closePin, HIGH);  // 신호 있을 때 HIGH로 출력
  delay(100);
  digitalWrite(closePin, LOW);   // 다시 LOW(0V)로 복귀
  
  Serial.println("D25 동작 완료");
} 