export default function EventCard({ title, type }) {
  return (
    <div className="bg-gray-200 rounded-xl h-40 flex items-center justify-center">
      <p className="text-gray-400 text-sm">{title || "Event Image"}</p>
    </div>
  );
}
