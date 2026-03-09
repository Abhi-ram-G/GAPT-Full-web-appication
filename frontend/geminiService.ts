
import { GoogleGenAI, Type } from "@google/genai";
import { AcademicData } from "./types";

export async function getGreenAcademicAnalysis(data: AcademicData, studentName: string) {
  try {
    // Fixed: Initialize GoogleGenAI inside the function to ensure up-to-date API key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Analyze the following academic data for ${studentName} and provide a "Green Academic Insight".
        Data:
        - Attendance: ${data.attendance}%
        - CGPA: ${data.cgpa}
        - SGPA: ${data.sgpa}
        - Total Paperless Credits: ${data.credits}
        - Environmental Impact Score: ${data.greenPoints}

        Context: GAPT is a paperless system. High performance and paperless habits contribute to a better "Green Academic Score".
        Please provide a professional, encouraging analysis in a JSON format.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            greenImpactRating: { type: Type.NUMBER, description: "Scale of 1-10" }
          },
          required: ["summary", "suggestions", "greenImpactRating"]
        }
      }
    });

    // Fixed: Ensure response text is defined before parsing
    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "Unable to generate analysis at this time.",
      suggestions: ["Continue maintaining paperless workflows.", "Ensure consistent attendance."],
      greenImpactRating: 0
    };
  }
}
