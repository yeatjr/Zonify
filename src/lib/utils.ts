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
    return imagePath;
};

// Haversine formula to calculate distance in km
export function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}
