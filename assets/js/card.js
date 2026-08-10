/*
 * card.js — simulated card checkout: format validation only.
 *
 * There is no payment provider, no network call, and no Luhn check. This
 * module exists so the wizard and the account page validate a card the same
 * way and show the same copy; the messages are COPY.md §2.5 verbatim.
 *
 * Nothing here stores anything. Callers keep card values in local variables
 * and persist at most the last four digits.
 */

/*
 * Returns a { fieldKey: message } object — empty when the card is acceptable.
 * `now` is injectable so the expiry rule is testable without clock games.
 */
export function validateCard({ name, number, expiry, cvc }, now = new Date()) {
  const errors = {};

  if (!String(name || "").trim()) errors.cardName = "Enter the cardholder's name.";

  const digits = String(number || "").replace(/\s/g, "");
  if (!/^\d{15,16}$/.test(digits)) {
    errors.cardNumber = "Card numbers are 15 or 16 digits. Check yours and try again.";
  }

  const m = String(expiry || "").trim().match(/^(\d{2})\/(\d{2})$/);
  if (!m) {
    errors.cardExpiry = "Enter the expiry as MM/YY.";
  } else {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month < 1 || month > 12) {
      errors.cardExpiry = "That month doesn't exist. Enter the expiry as MM/YY.";
    } else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      /* The card is good through the last day of its expiry month, so the
         current month passes and only strictly earlier months fail. */
      errors.cardExpiry = "That card has expired. Use an expiry date in the future.";
    }
  }

  if (!/^\d{3,4}$/.test(String(cvc || "").trim())) {
    errors.cardCvc = "Enter the 3 or 4 digit code on the back of the card.";
  }

  return errors;
}

/* The only part of a card that is ever allowed to reach storage. */
export function cardLast4(number) {
  return String(number || "").replace(/\s/g, "").slice(-4);
}
