export default function Message({ content, isBot }) {
  return (
    <div
      className={`p-4 rounded-lg ${
        isBot ? "bg-gray-100 ml-4" : "bg-blue-100 mr-4"
      }`}
    >
      <div
        className="prose"
        dangerouslySetInnerHTML={{
          __html: content.replace(/\n/g, "<br/>"),
        }}
      />
    </div>
  );
}
