const INDIVIDUAL_EXAM_PRICE_TIERS = Object.freeze([
    Object.freeze({ min: 1, max: 15, pricePerExam: 100 }),
    Object.freeze({ min: 16, max: 25, pricePerExam: 80 }),
    Object.freeze({ min: 26, max: 50, pricePerExam: 70 })
]);

const SCHOOL_PACKAGES = Object.freeze([
    Object.freeze({ id: 'basic', name: 'Basic', price: 10000, examCredits: 100 }),
    Object.freeze({ id: 'standard', name: 'Standard', price: 20000, examCredits: 300 }),
    Object.freeze({ id: 'premium', name: 'Premium', price: 30000, examCredits: 600 })
]);

function getIndividualExamPricing(quantity) {
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) return null;

    const tier = INDIVIDUAL_EXAM_PRICE_TIERS.find(({ min, max }) => quantity >= min && quantity <= max);
    return { quantity, pricePerExam: tier.pricePerExam, amount: quantity * tier.pricePerExam };
}

function getSchoolPackage(packageId) {
    return SCHOOL_PACKAGES.find(({ id }) => id === packageId) || null;
}

module.exports = {
    INDIVIDUAL_EXAM_PRICE_TIERS,
    SCHOOL_PACKAGES,
    getIndividualExamPricing,
    getSchoolPackage
};
