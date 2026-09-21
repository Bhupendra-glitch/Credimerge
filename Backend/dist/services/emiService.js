"use strict";
/**
 * Deterministic EMI math engine.
 * All financial calculations happen here — never in the frontend.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEmi = calculateEmi;
exports.totalInterest = totalInterest;
exports.buildAmortizationTable = buildAmortizationTable;
exports.aggregateLoans = aggregateLoans;
function calculateEmi(principal, annualRate, months) {
    if (principal <= 0 || months <= 0)
        return 0;
    const r = annualRate / 12 / 100;
    if (r === 0)
        return principal / months;
    return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}
function totalInterest(principal, annualRate, months) {
    return calculateEmi(principal, annualRate, months) * months - principal;
}
function buildAmortizationTable(loan) {
    const monthlyRate = loan.rate / 12 / 100;
    let balance = loan.outstanding;
    const rows = [];
    for (let m = 1; m <= loan.tenure && balance > 0; m++) {
        const interest = balance * monthlyRate;
        const principalPaid = loan.emi - interest;
        balance = Math.max(0, balance - principalPaid);
        rows.push({
            month: m,
            emi: +loan.emi.toFixed(2),
            principal: +principalPaid.toFixed(2),
            interest: +interest.toFixed(2),
            balance: +balance.toFixed(2),
        });
    }
    return rows;
}
function aggregateLoans(loans) {
    const totalOutstanding = loans.reduce((s, l) => s + l.outstanding, 0);
    const totalEmi = loans.reduce((s, l) => s + l.emi, 0);
    const totalInt = loans.reduce((s, l) => s + totalInterest(l.outstanding, l.rate, l.tenure), 0);
    const blendedRate = totalOutstanding > 0
        ? loans.reduce((s, l) => s + l.outstanding * l.rate, 0) / totalOutstanding
        : 0;
    return {
        totalOutstanding: +totalOutstanding.toFixed(2),
        totalEmi: +totalEmi.toFixed(2),
        totalInterest: +totalInt.toFixed(2),
        blendedRate: +blendedRate.toFixed(2),
        activeLoans: loans.length,
    };
}
