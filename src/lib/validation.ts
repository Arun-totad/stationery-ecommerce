export interface AddressValidationErrors {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
}

export function validateAddress(address: {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber?: string;
}): AddressValidationErrors {
  const errors: AddressValidationErrors = {};
  const notOnlyNumbers = (val: string) => /[a-zA-Z]/.test(val);

  if (!address.street || address.street.trim().length < 2 || !notOnlyNumbers(address.street)) {
    errors.street = 'Street is required and must contain at least 2 characters and some letters.';
  }
  if (!address.city || address.city.trim().length < 2 || !notOnlyNumbers(address.city)) {
    errors.city = 'City is required and must contain at least 2 characters and some letters.';
  }
  if (!address.state || address.state.trim().length < 2 || !notOnlyNumbers(address.state)) {
    errors.state = 'State is required and must contain at least 2 characters and some letters.';
  }
  if (!address.country || address.country.trim().length < 2 || !notOnlyNumbers(address.country)) {
    errors.country = 'Country is required and must contain at least 2 characters and some letters.';
  }
  if (!address.zipCode || !/^[0-9]{4,10}$/.test(address.zipCode.trim())) {
    errors.zipCode = 'Zip code must be 4-10 digits.';
  }
  if (address.phoneNumber !== undefined && address.phoneNumber !== null && address.phoneNumber !== '') {
    if (!/^\+?\d{10,15}$/.test(address.phoneNumber)) {
      errors.phoneNumber = 'Phone number must be valid (10-15 digits, can start with +).';
    }
  }
  return errors;
}