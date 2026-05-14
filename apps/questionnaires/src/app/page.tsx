// Landing page. Users normally land on /q/<key> via a LIFF link from
// LINE — this top-level page just gives a clue if someone wanders in
// directly.

export default function HomePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-8">
      <div className="max-w-md text-center flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Vitera 問卷</h1>
        <p className="text-slate-600">
          請從 LINE 訊息或選單裡的問卷連結進入。
        </p>
      </div>
    </main>
  );
}
