/* eslint-disable @next/next/no-img-element */
import React from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider, { Settings } from "react-slick";

export const Slideshow: React.FC<{ contents: string[] }> = ({ contents }) => {
  const settings: Settings = {
    dots: false,
    infinite: true,
    speed: 500,
    autoplaySpeed: 6000,
    arrows: false,
    autoplay: true,
  };

  return (
    <Slider {...settings}>
      {contents.map((content, index) => (
        <div
          id="content-container"
          className="!flex h-screen items-center justify-center self-center "
          key={content}
        >
          <div>
            <img
              height="100%"
              key={content}
              alt="template_image"
              src={content ?? ""}
              style={{ maxHeight: "100vh" }}
            />
          </div>
        </div>
      ))}
    </Slider>
  );
};

export default Slideshow;
