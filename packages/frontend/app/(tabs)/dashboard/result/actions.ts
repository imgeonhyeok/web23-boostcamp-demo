"use server";

interface IFeedbackResponse {
    score: string;
    feedback: string;
}

export async function getFeedback({ interviewId }: { interviewId: string }) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/interview/${interviewId}/feedback`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error("API 요청 실패");
  }

  const result = (await response.json()) as IFeedbackResponse;

  return {
    score: result.score,
    content: result.feedback,
  };
}