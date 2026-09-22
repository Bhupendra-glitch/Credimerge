"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEmi = calculateEmi;
exports.totalInterest = totalInterest;
exports.buildAmortizationTable = buildAmortizationTable;
exports.aggregateLoans = aggregateLoans;
function calculateEmi(principal, annualRate, months) {
    if (!Number.isFinite(principal) || !Number.isFinite(annualRate) || !Number.isFinite(months) || principal <= 0 || months <= 0)
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
        const principalPaid = Math.min(balance, Math.max(0, loan.emi - interest));
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
    const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstanding || 0), 0);
    const totalEmi = loans.reduce((s, l) => s + Number(l.emi || 0), 0);
    const totalInt = loans.reduce((s, l) => s + totalInterest(Number(l.outstanding || 0), Number(l.rate || 0), Number(l.tenure || 0)), 0);
    const blendedRate = totalOutstanding > 0
        ? loans.reduce((s, l) => s + Number(l.outstanding || 0) * Number(l.rate || 0), 0) / totalOutstanding
        : 0;
    return {
        totalOutstanding: +totalOutstanding.toFixed(2),
        totalEmi: +totalEmi.toFixed(2),
        totalInterest: +totalInt.toFixed(2),
        blendedRate: +blendedRate.toFixed(2),
        activeLoans: loans.length,
    };
}
