import Image from 'next/image';
import React from 'react';


interface ImageCardProps {
  src: string;
  alt: string;
  title: string;
  createDate: string;
  editDate: string;
}

const ImageCard: React.FC<ImageCardProps> = ({ src, alt, title, createDate, editDate }) => {
  return (
    <div className="max-w-sm rounded overflow-hidden shadow-lg hover:animate-pulse">
      <div className="relative h-48 w-full bg-white">
        {/* The Next.js Image component is wrapped in a relative container */}
        <Image
          src={src}
          alt={alt}
          fill={true} // 'fill' prop makes the image fill its parent container
          style={{ objectFit: 'cover' }} // CSS object-fit property for controlling image fit
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" 
        />
      </div>
      <div className="px-6 py-4">
        <div className="font-bold text-xl mb-2">{title}</div>
      </div>
      <div className="px-6 pt-4 pb-2">
        <p className="inline-block px-3 py-1 text-sm font-semibold text-white mr-2 mb-2">Created On: {createDate}</p>
        <span className="inline-block px-3 py-1 text-sm font-semibold text-white mr-2 mb-2">Last Edit: {editDate}</span>
      </div>
    </div>
  );
};

export default ImageCard;
