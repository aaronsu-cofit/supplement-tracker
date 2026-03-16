# 常見問題排除 (Troubleshooting)

## `Module not found: Can't resolve '@vitera/lib'`

**症狀：** 執行 `pnpm run dev:<app>` 後，瀏覽器顯示錯誤：
```
Module not found: Can't resolve '@vitera/lib'
```
即使套件連結和 `transpilePackages` 設定都正確也會發生。

**原因：** Turbopack 的 incremental cache 在修改 `packages/lib` 的 export 或各 app 的 `ClientLayout.js` import 後會過期失效。

**解法：** 清掉該 app 的 `.next` 快取再重啟：
```bash
rm -rf apps/<app-name>/.next
pnpm run dev:<app-name>
```

或使用 package.json 內建的 clean script：
```bash
pnpm run clean:hq    # 只清 hq
pnpm run clean       # 清所有 apps
```
