import { z } from "zod";

export const formValue = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" && value !== "__none" ? value : "";
};

export const validationErrors = (error: z.ZodError) => error.flatten().fieldErrors;
