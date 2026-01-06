// utils/time.ts

export const timeAgo = (timestamp: number): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - timestamp) / 1000);
    if (seconds < 5) return "همین الان";
    if (seconds < 60) return `${seconds} ثانیه پیش`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقیقه پیش`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعت پیش`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} روز پیش`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ماه پیش`;
    const years = Math.floor(months / 12);
    return `${years} سال پیش`;
};
