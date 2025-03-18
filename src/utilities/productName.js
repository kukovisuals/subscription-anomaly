const productNames = [
    "All Day Balconette",
    "Relief Bra",
    "Mesh Bralette",
    "3D Precision Bra",
    "Bralette"
];

function parseName(fullName) {
    // 1) First, check for the most specific product types (excluding "Bralette")
    for (let product of productNames) {
        if (product !== "Bralette" && fullName.endsWith(product)) {
            const color = fullName.slice(0, fullName.length - product.length).trim();
            return { product, color };
        }
    }

    // 2) Then, check for "Mesh Bralette" specifically
    if (fullName.endsWith("Mesh Bralette")) {
        const color = fullName.slice(0, fullName.length - "Mesh Bralette".length).trim();
        return { product: "Mesh Bralette", color };
    } else if (fullName.endsWith("Bralette") && !fullName.includes("Wireless")) {
        const color = fullName.slice(0, fullName.length - "Bralette".length).trim();
        return { product: "Support Bralette", color };
    } else if (fullName.includes("Wireless")) {
        const color = fullName.slice(0, fullName.length - "Wireless Bralette".length).trim();
        return { product: "Wireless Bralette", color };
    }

    // 4) If nothing matched, return the full name as a fallback (to prevent errors)
    return { product: fullName, color: "" };
}

export default parseName;