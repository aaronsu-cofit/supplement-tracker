# Period Tracker

女性生理週期追蹤應用，使用 React 19 + Vite 開發，支援 LINE LIFF 和行動應用。

## 功能特性

- 📅 **生理週期追蹤** - 記錄月經週期、週期長度、經期持續時間
- 📊 **經期症狀記錄** - 追蹤經血量、身體症狀、情緒變化
- 🔬 **經血或生殖泌尿症狀追蹤** (PBAC) - 記錄生理衛生用品的使用情況
- 💡 **智慧建議** - 根據週期階段提供專家建議和健康提示
- 📱 **LINE LIFF 整合** - 通過 LINE 應用直接使用
- 🔐 **使用者帳戶** - 支援登入和資料同步

## 技術棧

- **框架**: React 19
- **構建工具**: Vite
- **語言**: TypeScript
- **認證**: LINE LIFF + 自訂後端認證
- **樣式**: CSS
- **包管理**: pnpm (Workspace)

## 快速開始

### 開發環境

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev:period-tracker

# 構建
pnpm build

# 類型檢查
pnpm type-check

# Lint
pnpm lint
```

### 環境變數

在開發時，建立 `.env.local` 檔案（不要提交到版本控制）：

```env
VITE_API_URL=http://localhost:8080
VITE_PORT=5173
```

#### ⚠️ 重要：VITE_API_URL 僅在開發模式有效

**開發環境（Dev Mode）**：

- Vite dev server 會使用 `VITE_API_URL` 作為代理目標
- 前端使用相對路徑 `/api` 發送請求
- Vite dev server 攔截並代理到 `VITE_API_URL`

**生產環境（Docker 容器）**：

- `VITE_API_URL` 在構建時被嵌入編譯代碼，但無效
- 前端使用相對路徑 `/api` 發送請求
- **nginx 反向代理** 攔截並轉發到 `--build-arg BACKEND_URL` 指定的地址
- 此時 `VITE_API_URL` 被忽略

**原因**：

1. 構建產物（HTML/CSS/JS）在 Docker 構建時已生成，無法動態改變 `VITE_API_URL`
2. Docker 容器中的 nginx 實現了反向代理功能，不需要前端環境變數
3. 通過 nginx 代理比嵌入 URL 更靈活，支持容器化部署

**結論**：

- 在 Vite dev server 上開發時：使用 `VITE_API_URL=http://localhost:8080`
- 在 Docker 容器中運行時：通過 `--build-arg BACKEND_URL=...` 指定後端地址

## Docker 部署

容器使用 nginx 作為反向代理。前端使用相對路徑 `/api`，nginx 將這些請求代理到實際的後端服務。

### 構建鏡像

可以在構建時指定後端服務地址，預設值為 `http://localhost:8080`。

```bash
# 簡單構建（使用預設後端地址 http://localhost:8080）
docker build -t period-tracker:latest -f apps/period-tracker/Dockerfile .

# 本地開發（Mac/Windows - 連接到主機的後端服務）
docker build \
  --build-arg BACKEND_URL=http://host.docker.internal:8080 \
  -t period-tracker:latest -f apps/period-tracker/Dockerfile .

# 本地開發（Linux - 使用主機 IP 地址）
docker build \
  --build-arg BACKEND_URL=http://192.168.0.12:8080 \
  -t period-tracker:latest -f apps/period-tracker/Dockerfile .

# 生產環境（GKE Kubernetes）
docker build \
  --build-arg BACKEND_URL=http://backend-service:8000 \
  -t period-tracker:latest -f apps/period-tracker/Dockerfile .

# 自訂後端地址
docker build \
  --build-arg BACKEND_URL=https://api.example.com \
  -t period-tracker:latest -f apps/period-tracker/Dockerfile .
```

### 執行容器（本地開發）

#### 本地開發（Mac/Windows Docker Desktop）

```bash
# 1. 確保後端服務在主機的 8080 port 運行
# pnpm dev (在另一個終端)

# 2. 構建容器（指定後端服務地址）
docker build \
  --build-arg BACKEND_URL=http://host.docker.internal:8080 \
  -t period-tracker:latest -f apps/period-tracker/Dockerfile .

# 3. 運行容器
docker run -p 3000:3000 period-tracker:latest
```

應用會在 `http://localhost:3000` 上執行：

- 靜態資源（HTML/CSS/JS）直接由 nginx 提供
- `/api/*` 請求自動代理到 `http://host.docker.internal:8080/api/*`

#### 本地開發（Linux）

在 Linux 環境下，`host.docker.internal` 不被支援，需要使用實際的主機 IP：

```bash
# 1. 確保後端服務在主機的 8080 port 運行

# 2. 獲取主機 IP 地址
HOST_IP=$(hostname -I | awk '{print $1}')
echo "Host IP: ${HOST_IP}"

# 3. 構建容器（使用實際主機 IP）
docker build \
  --build-arg BACKEND_URL=http://${HOST_IP}:8080 \
  -t period-tracker:latest -f apps/period-tracker/Dockerfile .

# 4. 運行容器
docker run -p 3000:3000 period-tracker:latest
```

#### 環境變數配置

| 參數/變數 | 本地開發 (Mac/Windows) | 本地開發 (Linux) | 生產/GKE | 說明 |
| --- | --- | --- | --- | --- |
| `--build-arg BACKEND_URL` | `http://host.docker.internal:8080` | `http://{HOST_IP}:8080` | `http://backend-service:8000` | nginx 反向代理到的後端服務地址（構建時指定） |

#### 驗證容器

```bash
# 檢查前端是否正常
curl -I http://localhost:3000

# 檢查 health endpoint
curl http://localhost:3000/health

# 檢查 API 代理（需要後端服務正常運行）
curl http://localhost:3000/api/cycle/user
```

## GKE 部署

### 1. 構建並推送到 Google Container Registry

```bash
# 設置變數
export PROJECT_ID=your-gcp-project
export IMAGE_NAME=period-tracker
export IMAGE_TAG=latest
export GCR_URL=gcr.io/${PROJECT_ID}/${IMAGE_NAME}:${IMAGE_TAG}

# 構建鏡像（指定後端服務地址）
docker build \
  --build-arg BACKEND_URL=http://backend-service:8000 \
  -t ${GCR_URL} -f apps/period-tracker/Dockerfile .

# 推送到 GCR
docker push ${GCR_URL}
```

### 2. 部署到 Kubernetes

鏡像已包含了後端服務地址，可直接部署。如需修改，編輯 `k8s-deployment.yaml`：

```yaml
# 修改鏡像 URL
image: gcr.io/your-gcp-project/period-tracker:latest
```

如果需要動態修改後端地址（不重新構建鏡像），可以在構建時使用不同的 `BACKEND_URL`：

```bash
# 部署不同環境的版本
docker build \
  --build-arg BACKEND_URL=http://staging-backend-service:8000 \
  -t ${GCR_URL}-staging -f apps/period-tracker/Dockerfile .
```

### 3. 部署到 GKE

```bash
# 連接到 GKE 集群
gcloud container clusters get-credentials your-cluster-name --zone us-central1-a

# 部署應用
kubectl apply -f apps/period-tracker/k8s-deployment.yaml

# 檢查部署狀態
kubectl get pods -l app=period-tracker
kubectl get svc period-tracker-service
```

### 4. 查看日誌

```bash
# 查看 Pod 日誌
kubectl logs -l app=period-tracker -f

# 查看特定 Pod 日誌
kubectl logs period-tracker-xxxxx -f
```

### 注意事項

- 後端服務地址在 Docker 構建時設置（`--build-arg BACKEND_URL=...`），不能在運行時修改
- 如需修改後端地址，需要重新構建鏡像
- 前端應用使用相對路徑 `/api` 進行 API 調用，由 nginx 反向代理到真實後端
- 確保 Kubernetes 集群中的 `backend-service` 服務名稱和端口正確配置

### Ingress 配置（選擇性）

如果使用 Nginx Ingress：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: period-tracker-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: period-tracker.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: period-tracker-service
            port:
              number: 80
```

## 專案結構

```
apps/period-tracker/
├── src/
│   ├── components/       # React 元件
│   ├── pages/           # 頁面
│   ├── utils/           # 工具函數
│   ├── api/             # API 呼叫
│   ├── types.ts         # TypeScript 類型定義
│   ├── constants.ts     # 常數
│   ├── App.tsx          # 主元件
│   ├── App.css          # 全域樣式
│   └── main.tsx         # 進入點
├── public/              # 靜態資源（圖示等）
├── index.html           # HTML 模板
├── vite.config.ts       # Vite 配置
├── tsconfig.json        # TypeScript 配置
└── Dockerfile           # Docker 構建檔案
```

## API 整合

應用與後端進行以下 API 整合：

- `POST /api/auth/me` - 使用者登入認證
- `GET /api/cycle/*` - 取得週期資料
- `POST /api/cycle/*` - 保存週期資料
- `PUT /api/settings` - 更新設定

詳見 [src/api/client.ts](./src/api/client.ts)

## 依賴套件

核心依賴：
- `react` - React 框架
- `react-dom` - React DOM 渲染
- `react-router-dom` - 路由管理
- `axios` - HTTP 客戶端
- `@line/liff` - LINE LIFF SDK
- `eruda` - 行動裝置除錯工具

Workspace 依賴：
- `@vitera/client-auth` - 認證工具
- `@vitera/types` - 共用類型
- `@vitera/utils` - 工具函數
- `@vitera/eslint-config` - ESLint 配置
- `@vitera/typescript-config` - TypeScript 配置

## 貢獻指南

1. 創建功能分支
2. 提交變更
3. 確保通過 TypeScript 類型檢查和 Lint
4. 提交 Pull Request

## 授權

MIT
