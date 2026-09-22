import DayCard from './DayCard.jsx';

export default function ScheduleTab({ schedule }) {
  if (!schedule?.length) {
    return <p className="text-slate-500">No schedule was generated.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {schedule.map((day, i) => (
        <DayCard key={`${day.date}-${i}`} day={day} />
      ))}
    </div>
  );
}
