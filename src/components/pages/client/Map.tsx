import {
  GoogleMap,
  DirectionsRenderer,
  LoadScript,
} from "@react-google-maps/api";
import { useEffect, useState } from "react";
import SafeContentFrame from "./SafeContentFrame";

const center = { lat: 45.90458978842966, lng: -103.64974223855128 };

const SimpleMap: React.FC<{
  origin: string;
  destination: string;
  languageCode: string;
}> = ({ origin, destination, languageCode }) => {

  return (
    <LoadScript
      googleMapsApiKey="AIzaSyBB5xoUCTVJoyYUy-4r7LAySR8SpfaVsHA"
      libraries={["places"]}
      language={languageCode}
    >
      <Directions
        destination={destination}
        origin={origin}
        travelMethod={"DRIVING" as any}
        languageCode={languageCode}
      />
    </LoadScript>
  );
};
const Directions: React.FC<{
  origin: string;
  destination: string;
  travelMethod: google.maps.TravelMode;
  languageCode: string;
}> = ({ destination, travelMethod, origin, languageCode }) => {
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [currTravelMethod, setCurrTravelMethod] =
    useState<google.maps.TravelMode>();

  useEffect(() => {
    calculateRoute();
  }, [origin, destination, currTravelMethod]);

  useEffect(() => {
    setCurrTravelMethod(travelMethod);
  }, [travelMethod]);

  async function calculateRoute() {
    // eslint-disable-next-line no-undef
    const directionsService = new google.maps.DirectionsService();
    const results = await directionsService.route({
      origin,
      destination,
      unitSystem: google.maps.UnitSystem.METRIC,
      // eslint-disable-next-line no-undef
      travelMode: currTravelMethod ?? google.maps.TravelMode["DRIVING"],
      language: languageCode,
      provideRouteAlternatives: true,
    });

    setDirectionsResponse(results);
    setDistance(results.routes[0].legs[0].distance?.text ?? "");
    setDuration(results.routes[0].legs[0].duration?.text ?? "");
  }
  return (
    <SafeContentFrame className="relative flex flex-col items-center overflow-hidden">
      <div className="absolute left-0 top-0 h-full w-full">
        {/* Google Map Box */}
        <GoogleMap
          center={center}
          zoom={15}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          options={{
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {directionsResponse && (
            <DirectionsRenderer directions={directionsResponse} />
          )}
        </GoogleMap>
      </div>

      <div className="z-1 absolute left-0 top-0 m-4 overflow-x-auto rounded-lg bg-white p-4 shadow-lg">
        <div className="flex flex-col justify-between gap-2">
          <div className="flex w-full items-center">
            <svg
              version="1.0"
              xmlns="http://www.w3.org/2000/svg"
              width="15.000000pt"
              height="15.000000pt"
              viewBox="0 0 36.000000 36.000000"
              preserveAspectRatio="xMidYMid meet"
            >
              <g
                transform="translate(0.000000,36.000000) scale(0.100000,-0.100000)"
                fill="#000000"
                stroke="none"
              >
                <path
                  d="M130 287 c-13 -7 -35 -28 -48 -47 -57 -83 21 -195 122 -176 36 7 79
48 91 87 29 89 -80 179 -165 136z m111 -46 c39 -40 39 -82 0 -122 -20 -20 -39
-29 -61 -29 -22 0 -41 9 -61 29 -39 40 -39 82 0 122 20 20 39 29 61 29 22 0
41 -9 61 -29z"
                />
              </g>
            </svg>
            <p className="text-md">
              {origin.slice(0, 30)}
              {origin.length > 30 ? "..." : ""}
            </p>
          </div>
          <div className="flex w-full items-center">
            <svg
              version="1.0"
              xmlns="http://www.w3.org/2000/svg"
              width="15.000000pt"
              height="15.000000pt"
              viewBox="0 0 36.000000 36.000000"
              preserveAspectRatio="xMidYMid meet"
            >
              <g
                transform="translate(0.000000,36.000000) scale(0.100000,-0.100000)"
                fill="#D92F25"
                stroke="none"
              >
                <path
                  d="M130 317 c-32 -16 -70 -73 -70 -104 0 -14 7 -40 16 -58 19 -41 86
-115 104 -115 18 0 77 65 101 112 34 66 13 130 -53 164 -33 17 -65 18 -98 1z
m101 -30 c52 -40 51 -100 -1 -166 -22 -28 -44 -51 -48 -51 -24 0 -92 102 -92
137 0 33 20 70 44 81 29 14 78 14 97 -1z"
                />
                <path
                  d="M160 224 c-11 -12 -10 -18 3 -32 16 -15 18 -15 34 0 13 14 14 20 3
32 -7 9 -16 16 -20 16 -4 0 -13 -7 -20 -16z"
                />
              </g>
            </svg>

            <p title={destination} className="text-md">
              {destination.slice(0, 30)}
              {destination.length > 30 ? "..." : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex w-full justify-end  px-2">
          <div className="flex w-full items-center justify-end gap-2">
            <svg
              fill="#000000"
              height="32px"
              width="32px"
              version="1.1"
              id="Layer_1"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              viewBox="0 0 502 502"
              xmlSpace="preserve"
            >
              <g>
                <g>
                  <g>
                    <path
                      d="M117.253,371.669c3.112,0,6.047-1.449,7.939-3.919c0.271-0.354,27.396-35.857,54.14-78.162
				c36.611-57.913,55.174-100.707,55.174-127.194c0-64.654-52.6-117.253-117.253-117.253S0,97.74,0,162.393
				c0,26.487,18.563,69.282,55.174,127.194c26.744,42.305,53.869,77.808,54.14,78.162
				C111.207,370.22,114.141,371.669,117.253,371.669z M20,162.393c0-53.625,43.628-97.253,97.253-97.253
				s97.253,43.628,97.253,97.253c0,42.092-64.164,137.76-97.254,182.618C84.16,300.158,20,204.504,20,162.393z"
                    />
                    <path
                      d="M187.544,162.393c0-38.758-31.532-70.291-70.291-70.291c-38.759,0-70.291,31.532-70.291,70.291
				c0,38.759,31.532,70.291,70.291,70.291C156.012,232.684,187.544,201.152,187.544,162.393z M66.963,162.393
				c0-27.73,22.56-50.291,50.291-50.291c27.731,0,50.291,22.56,50.291,50.291s-22.56,50.291-50.291,50.291
				C89.523,212.684,66.963,190.124,66.963,162.393z"
                    />
                    <path
                      d="M127.253,132.103c0-5.523-4.477-10-10-10c-22.216,0-40.291,18.074-40.291,40.291c0,5.523,4.477,10,10,10
				c5.523,0,10-4.477,10-10c0-11.188,9.102-20.291,20.291-20.291C122.776,142.103,127.253,137.626,127.253,132.103z"
                    />
                    <path
                      d="M384.746,45.14c-64.654,0-117.253,52.6-117.253,117.253c0,26.487,18.563,69.282,55.174,127.194
				c26.744,42.305,53.869,77.808,54.14,78.162c1.892,2.471,4.827,3.919,7.939,3.919s6.047-1.449,7.939-3.919
				c0.271-0.354,27.396-35.857,54.141-78.162C483.437,231.675,502,188.881,502,162.393C502,97.74,449.4,45.14,384.746,45.14z
				 M384.746,345.012c-33.093-44.854-97.253-140.508-97.253-182.619c0-53.625,43.628-97.253,97.253-97.253
				c53.626,0,97.254,43.628,97.254,97.253C482,204.485,417.836,300.154,384.746,345.012z"
                    />
                    <path
                      d="M384.746,92.103c-38.758,0-70.29,31.532-70.29,70.291c0,38.759,31.532,70.291,70.29,70.291s70.291-31.532,70.291-70.291
				C455.037,123.635,423.504,92.103,384.746,92.103z M384.746,212.684c-27.73,0-50.29-22.56-50.29-50.291s22.56-50.291,50.29-50.291
				c27.73,0,50.291,22.56,50.291,50.291S412.477,212.684,384.746,212.684z"
                    />
                    <path
                      d="M384.15,388.86c-18.748,0-34,15.252-34,34s15.252,34,34,34s34-15.252,34-34S402.897,388.86,384.15,388.86z
				 M384.15,436.86c-7.72,0-14-6.28-14-14c0-7.72,6.28-14,14-14c7.72,0,14,6.28,14,14C398.15,430.58,391.87,436.86,384.15,436.86z"
                    />
                    <path d="M323.15,412.86h-27c-5.523,0-10,4.477-10,10s4.477,10,10,10h27c5.523,0,10-4.477,10-10S328.673,412.86,323.15,412.86z" />
                    <path
                      d="M261.15,412.86H149.647c-4.281-13.882-17.229-24-32.497-24c-18.748,0-34,15.252-34,34s15.252,34,34,34
				c15.268,0,28.217-10.118,32.497-24H261.15c5.523,0,10-4.477,10-10S266.673,412.86,261.15,412.86z M117.15,436.86
				c-7.72,0-14-6.28-14-14c0-7.72,6.28-14,14-14c7.72,0,14,6.28,14,14C131.15,430.58,124.87,436.86,117.15,436.86z"
                    />
                  </g>
                </g>
              </g>
            </svg>
            <p className="text-sm"> {distance} </p>
            <div className="ml-2  flex items-center gap-2">
              <svg
                width="32px"
                height="32px"
                viewBox="0 0 64 64"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                stroke="#000000"
              >
                <circle cx="32" cy="32" r="24" />
                <polyline points="40 44 32 32 32 16" />
              </svg>
              <p className="text-sm"> {duration} </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex w-full justify-end gap-4">
          <button
            onClick={() => {
              setCurrTravelMethod(google.maps.TravelMode["TRANSIT"]);
            }}
          >
            <svg
              width="35px"
              height="35px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 6V15.8C5 16.9201 5 17.4802 5.21799 17.908C5.40973 18.2843 5.71569 18.5903 6.09202 18.782C6.51984 19 7.07989 19 8.2 19H15.8C16.9201 19 17.4802 19 17.908 18.782C18.2843 18.5903 18.5903 18.2843 18.782 17.908C19 17.4802 19 16.9201 19 15.8V6M5 6C5 6 5 3 12 3C19 3 19 6 19 6M5 6H19M5 13H19M17 21V19M7 21V19M8 16H8.01M16 16H16.01"
                style={{
                  stroke:
                    currTravelMethod === google.maps.TravelMode["TRANSIT"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <button
            onClick={() => {
              setCurrTravelMethod(google.maps.TravelMode["DRIVING"]);
            }}
          >
            <svg
              width="35px"
              height="35px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 8L5.72187 10.2682C5.90158 10.418 6.12811 10.5 6.36205 10.5H17.6379C17.8719 10.5 18.0984 10.418 18.2781 10.2682L21 8M6.5 14H6.51M17.5 14H17.51M8.16065 4.5H15.8394C16.5571 4.5 17.2198 4.88457 17.5758 5.50772L20.473 10.5777C20.8183 11.1821 21 11.8661 21 12.5623V18.5C21 19.0523 20.5523 19.5 20 19.5H19C18.4477 19.5 18 19.0523 18 18.5V17.5H6V18.5C6 19.0523 5.55228 19.5 5 19.5H4C3.44772 19.5 3 19.0523 3 18.5V12.5623C3 11.8661 3.18166 11.1821 3.52703 10.5777L6.42416 5.50772C6.78024 4.88457 7.44293 4.5 8.16065 4.5ZM7 14C7 14.2761 6.77614 14.5 6.5 14.5C6.22386 14.5 6 14.2761 6 14C6 13.7239 6.22386 13.5 6.5 13.5C6.77614 13.5 7 13.7239 7 14ZM18 14C18 14.2761 17.7761 14.5 17.5 14.5C17.2239 14.5 17 14.2761 17 14C17 13.7239 17.2239 13.5 17.5 13.5C17.7761 13.5 18 13.7239 18 14Z"
                style={{
                  stroke:
                    currTravelMethod === google.maps.TravelMode["DRIVING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <button
            onClick={() => {
              setCurrTravelMethod(google.maps.TravelMode["WALKING"]);
            }}
          >
            <svg
              width="35px"
              height="35px"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M13.3692 5.13905C13.3692 6.00924 12.6638 6.71466 11.7936 6.71466C10.9234 6.71466 10.218 6.00924 10.218 5.13905C10.218 4.26887 10.9234 3.56345 11.7936 3.56345C12.6638 3.56345 13.3692 4.26887 13.3692 5.13905Z"
                style={{
                  stroke:
                    currTravelMethod === google.maps.TravelMode["WALKING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                  fill:
                    currTravelMethod === google.maps.TravelMode["WALKING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
                stroke-width="1.35052"
              />
              <path
                d="M11.7782 14.8313H9.48168C9.94681 12.7756 9.94681 11.0994 9.94681 9.42322L12.1943 9.64358C12.1943 11.2195 11.7782 13.0771 11.7782 14.8313Z"
                style={{
                  fill:
                    currTravelMethod === google.maps.TravelMode["WALKING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
              />
              <path
                d="M9.48168 14.8313C8.09375 17.284 6.95068 21.1119 6.95068 21.1119M9.48168 14.8313C10.2219 14.8313 11.038 14.8313 11.7782 14.8313M9.48168 14.8313C9.94681 12.7756 9.94681 11.0994 9.94681 9.42322L12.1943 9.64358C12.1943 11.2195 11.7782 13.0771 11.7782 14.8313M11.7782 14.8313C13.2124 17.284 12.4653 21.1119 12.4653 21.1119"
                style={{
                  stroke:
                    currTravelMethod === google.maps.TravelMode["WALKING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
                stroke-width="2.36342"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M12.6599 9.42322L14.8501 12.9967L17.5324 11.8874"
                style={{
                  stroke:
                    currTravelMethod === google.maps.TravelMode["WALKING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
                stroke-width="1.67621"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9.80518 9.08887L6.53081 10.0556L8.79988 13.627"
                style={{
                  stroke:
                    currTravelMethod === google.maps.TravelMode["WALKING"]
                      ? "rgb(59, 89, 152)"
                      : "#000000",
                }}
                stroke-width="1.67621"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </SafeContentFrame>
  );
};

export default SimpleMap;
