export default function LoadingState({
  title = 'Building your study plan...',
  subtitle = 'Estimating difficulty and spacing out your topics.',
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-500" />
      <p className="mt-5 text-base font-medium text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    </div>
  );
}
