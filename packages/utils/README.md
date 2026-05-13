# @vitera/utils

共用工具函數套件。

## 功能

### Environment Variable Validation

使用 Zod 驗證環境變數，提供型別安全和執行時期檢查。

```typescript
import { z } from 'zod'
import { validateEnv } from '@vitera/utils'

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
})

const env = validateEnv(envSchema)
// env.PORT 是 number 類型
// env.NODE_ENV 是 'development' | 'production' | 'test' 類型
```

## 測試

```bash
pnpm test
```
