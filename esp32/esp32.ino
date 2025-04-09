#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "sim의 iPhone";
const char* password = "1234567890";

const char* serverUrl = "https://pariking-system-production.up.railway.app";
const char* deviceId = "ESP32_001";
const char* deviceSecret = "esp32-secret-key";

// 핀 설정
const int openSignalPin = 25;    // 차단기 열림 신호 핀
const int closeSignalPin = 26;   // 차단기 닫힘 신호 핀

// 리모컨 신호 제어 함수
void sendOpenSignal() {
  digitalWrite(openSignalPin, HIGH);
  delay(100);  // 신호 유지 시간
  digitalWrite(openSignalPin, LOW);
  Serial.println("🔓 차단기 열림 신호 전송");
}

void sendCloseSignal() {
  digitalWrite(closeSignalPin, HIGH);
  delay(100);  // 신호 유지 시간
  digitalWrite(closeSignalPin, LOW);
  Serial.println("🔒 차단기 닫힘 신호 전송");
}

// WiFi 연결 함수
void connectToWiFi() {
  Serial.print("📶 Wi-Fi 연결 중");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ Wi-Fi 연결 완료!");
    Serial.println("🌐 IP 주소: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ Wi-Fi 연결 실패");
  }
}

// 서버에서 제어 명령을 받는 함수
void checkServerCommand() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverUrl) + "/api/device/command/" + String(deviceId);
    
    http.begin(url);
    http.addHeader("Authorization", deviceSecret);
    
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<200> doc;
      deserializeJson(doc, payload);
      
      String command = doc["command"];
      if (command == "open") {
        Serial.println("📡 서버로부터 열림 명령 수신");
        sendOpenSignal();
      } else if (command == "close") {
        Serial.println("📡 서버로부터 닫힘 명령 수신");
        sendCloseSignal();
      }
    }
    
    http.end();
  }
}

void setup() {
  Serial.begin(115200);

  // 핀 모드 설정
  pinMode(openSignalPin, OUTPUT);
  pinMode(closeSignalPin, OUTPUT);

  // 초기 상태 설정
  digitalWrite(openSignalPin, LOW);
  digitalWrite(closeSignalPin, LOW);

  // WiFi 연결
  connectToWiFi();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    checkServerCommand();
  } else {
    Serial.println("❌ Wi-Fi 연결 끊김 → 재연결 중...");
    connectToWiFi();
  }
  
  delay(1000);  // 1초마다 서버 확인
} 