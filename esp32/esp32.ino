#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// 📡 WiFi 설정
const char* ssid = "sim의 iPhone";
const char* password = "1234567890";

// 🌐 서버 설정
const char* serverUrl = "https://project1-production-f338.up.railway.app";
const char* deviceId = "ESP32_001";
const char* deviceSecret = "esp32-secret-key";

// 📍 핀 설정
const int openPin = 26;   // 열림 신호 핀
const int closePin = 25;  // 닫힘 신호 핀
const int statusLedPin = 2;  // 내장 LED (연결 상태 표시용)

// 상태 변수
bool alreadyOpened = false;
bool alreadyClosed = false;
bool isConnected = false;
unsigned long lastCheck = 0;
const unsigned long interval = 1000;  // 1초마다 서버 확인

// SSL 클라이언트
WiFiClientSecure client;

void setup() {
  Serial.begin(115200);
  
  // GPIO 설정
  pinMode(openPin, OUTPUT);
  pinMode(closePin, OUTPUT);
  pinMode(statusLedPin, OUTPUT);
  
  digitalWrite(openPin, HIGH);   // Active LOW로 설정
  digitalWrite(closePin, HIGH);  // Active LOW로 설정
  digitalWrite(statusLedPin, LOW);
  
  // SSL 인증서 검증 비활성화 (개발용)
  client.setInsecure();
  
  // WiFi 연결
  WiFi.begin(ssid, password);
  Serial.print("🌐 WiFi 연결 중...");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi 연결됨!");
  Serial.print("📍 IP 주소: ");
  Serial.println(WiFi.localIP());
  digitalWrite(statusLedPin, HIGH);
}

void loop() {
  // WiFi 연결 확인
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi 연결 끊김. 재연결 중...");
    digitalWrite(statusLedPin, LOW);
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

  Serial.print("🌐 URL 요청: ");
  Serial.println(url);

  if (https.begin(client, url)) {
    // 헤더에 deviceSecret만 전송
    https.addHeader("Authorization", deviceSecret);
    https.addHeader("Content-Type", "application/json");

    // 요청 헤더 디버깅
    Serial.println("📤 요청 헤더:");
    Serial.println("Authorization: " + String(deviceSecret));
    Serial.println("Content-Type: application/json");

    int httpCode = https.GET();
    String payload = https.getString();

    Serial.print("📥 응답 코드: ");
    Serial.println(httpCode);
    Serial.print("📥 응답 내용: ");
    Serial.println(payload);

    if (httpCode == 200) {
      Serial.println("📨 서버 응답: " + payload);

      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.print("❌ JSON 파싱 실패: ");
        Serial.println(error.c_str());
        https.end();
        return;
      }

      // command 필드 확인
      const char* command = doc["command"];
      if (!command) {
        Serial.println("❌ command 필드 없음");
        https.end();
        return;
      }

      // 열기 명령 확인
      if (strcmp(command, "open") == 0 && !alreadyOpened) {
        Serial.println("🔓 차단기 열림 명령 수신");
        digitalWrite(openPin, LOW);
        delay(500);
        digitalWrite(openPin, HIGH);
        alreadyOpened = true;
        alreadyClosed = false;
        
        // 상태 변경 알림
        notifyStatus("opened");
      }
      // 닫기 명령 확인
      else if (strcmp(command, "close") == 0 && !alreadyClosed) {
        Serial.println("🔒 차단기 닫힘 명령 수신");
        digitalWrite(closePin, LOW);
        delay(500);
        digitalWrite(closePin, HIGH);
        alreadyClosed = true;
        alreadyOpened = false;
        
        // 상태 변경 알림
        notifyStatus("closed");
      }
    } else if (httpCode == 301 || httpCode == 302) {
      Serial.println("⚠️ 리다이렉션 발생");
      String newUrl = https.header("Location");
      Serial.print("새로운 URL: ");
      Serial.println(newUrl);
    } else if (httpCode == 401) {
      Serial.println("❌ 인증 실패: API 키를 확인해주세요");
    } else if (httpCode == 404) {
      Serial.println("❌ API 엔드포인트를 찾을 수 없습니다");
    } else {
      Serial.printf("❌ 서버 요청 실패: %d\n", httpCode);
    }
  } else {
    Serial.println("❌ HTTPS 연결 실패");
  }

  https.end();
}

// 상태 변경을 서버에 알림
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
      Serial.println("✅ 상태 업데이트 성공");
    } else {
      Serial.printf("❌ 상태 업데이트 실패: %d\n", httpCode);
    }
  } else {
    Serial.println("❌ HTTPS 연결 실패");
  }

  https.end();
} 