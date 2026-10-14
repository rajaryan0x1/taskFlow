import axios from "axios";

/** Only expose string messages from the API's documented field-error envelope. */
export const getFieldErrors = (error: unknown): Record<string, string[]> => {
    if (!axios.isAxiosError(error)) return {};
    const errors: unknown = error.response?.data?.errors;
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};
    return Object.fromEntries(Object.entries(errors).flatMap(([field, messages]) => {
        if (!Array.isArray(messages)) return [];
        const strings = messages.filter((message): message is string => typeof message === "string" && message.length > 0);
        return strings.length ? [[field, strings]] : [];
    }));
};

export const getErrorMessage = (error: unknown, defaultMessage = "An unexpected error occurred"): string => {
    const fields = getFieldErrors(error);
    if (Object.keys(fields).length) {
        return Object.entries(fields).map(([field, messages]) => {
            const label = field.replace(/([a-z])([A-Z])/g, "$1 $2");
            return `${label.charAt(0).toUpperCase()}${label.slice(1)}: ${messages.join(". ")}`;
        }).join("; ");
    }
    if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
        return error.response.data.message;
    }
    if (error instanceof Error) return error.message;
    return defaultMessage;
};
