import ImageCard from "../components/Card";

const cardData = [
  { id: 1, src:"/globe.svg", alt:"", title: "Mountain View", createDate:"Today", editDate:"Tomorrow" }, // will have to change these all so it gets it from the database
  { id: 2, src:"/globe.svg", alt:"", title: "Ocean Breeze", createDate:"Today", editDate:"Tomorrow" },
  { id: 3, src:"/globe.svg", alt:"", title: "City View", createDate:"Today", editDate:"Tomorrow" },
  { id: 4, src:"/globe.svg", alt:"", title: "Beach Water", createDate:"Today", editDate:"Tomorrow" },
];

export default function Test() {
  return (
    <div className="p-10">
        <h1 className="text-2xl font-bold mb-4 text-orange-600">Recent Projects</h1>
        <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cardData.map((project) => (
            <ImageCard
                key={project.id}
                src={project.src}
                alt={project.alt}
                title={project.title}
                createDate={project.createDate}
                editDate={project.editDate}
            />
            ))}
        </div>
    </div>
  );
}
