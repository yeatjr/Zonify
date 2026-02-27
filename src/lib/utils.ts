export const getImageSrc = (imagePath: string | null | undefined) => {
    if (!imagePath) return '';
    // If it's a base64 string (starts with data: or is likely base64)
    if (imagePath.startsWith('data:') || imagePath.startsWith('http')) {
        return imagePath;
    }
    // If it's base64 but missing the prefix
    if (imagePath.length > 500) {
        return `data:image/jpeg;base64,${imagePath}`;
    }
    // Otherwise assume it's a URL
    return imagePath;
};
