"use server";

import { SelectedDocs } from "./page";

export async function createInterviewAction(
  mode: string,
  title: string,
  selectedDocs: SelectedDocs,
) {
  const isTech = mode === "tech";
  const endpoint = isTech
    ? "/interview/tech/create"
    : "/interview/coding/create";

  const requestBody = isTech
    ? {
        documentIds: [selectedDocs.COVER_LETTER, selectedDocs.PORTFOLIO].filter(
          Boolean,
        ),
      }
    : {
        simulationTitle: title,
        language: "javascript",
      };
  const response = await fetch(
    `${process.env.API_URL || process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("인터뷰 생성 실패");
  }

  return await response.json();
}
