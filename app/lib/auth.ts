import { User } from "../types";

const storedUserKey = "noble-gamers-user";

export function getStoredUser(): User | null {
    if (typeof window === "undefined") return null;

    const storedUser = window.localStorage.getItem(storedUserKey);
    if (!storedUser) return null;

    try {
        return JSON.parse(storedUser) as User;
    } catch {
        window.localStorage.removeItem(storedUserKey);
        return null;
    }
}

export function saveStoredUser(user: User) {
    window.localStorage.setItem(storedUserKey, JSON.stringify(user));
}

export function clearStoredUser() {
    window.localStorage.removeItem(storedUserKey);
}
