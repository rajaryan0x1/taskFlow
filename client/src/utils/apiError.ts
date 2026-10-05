import axios from "axios";

export const getErrorMessage = (error: unknown, defaultMessage = "An unexpected error occurred"): string => {
    if (axios.isAxiosError(error)) {
        if (error.response?.data?.message) {
            return error.response.data.message;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return defaultMessage;
};
