"use client";
import React, { useEffect, useState } from "react";

const JotFormResponse = () => {
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/api/jotform/responses")
      .then((response) => response.json())
      .then((data) => setResponses(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Form Responses</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-400 shadow-md rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal border border-gray-400">
              <th className="py-3 px-6 border border-gray-400 text-left">Name</th>
              <th className="py-3 px-6 border border-gray-400 text-left">Email</th>
              <th className="py-3 px-6 border border-gray-400 text-left">Phone Number</th>
              <th className="py-3 px-6 border border-gray-400 text-left">How did you hear about us?</th>
              <th className="py-3 px-6 border border-gray-400 text-left">Feedback</th>
              <th className="py-3 px-6 border border-gray-400 text-left">Suggestions</th>
              <th className="py-3 px-6 border border-gray-400 text-left">Will You Recommend?</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 text-sm font-light">
            {responses.map((response, index) => {
              let parsedData;
              try {
                parsedData = JSON.parse(response?.data);
                parsedData = JSON.parse(parsedData?.rawRequest);
              } catch (error) {
                console.error("Error parsing JSON:", error);
                return null;
              }

              return (
                <tr key={index} className="border border-gray-400 hover:bg-gray-100">
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q3_fullName3?.first} {parsedData?.q3_fullName3?.last}</td>
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q6_email6 || "N/A"}</td>
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q5_phoneNumber5?.full || "N/A"}</td>
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q8_howDid8 || "N/A"}</td>
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q11_feedbackAbout11 || "N/A"}</td>
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q12_suggestionsIf || "N/A"}</td>
                  <td className="py-3 px-6 border border-gray-400">{parsedData?.q15_willYou15 || "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JotFormResponse;