export const validateInput = (data, requiredFields) => {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Request body must be a valid object']
    };
  }
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};
