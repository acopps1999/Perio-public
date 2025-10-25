import * as Yup from 'yup';

// Login validation schema
export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required')
    .max(255, 'Email must be less than 255 characters'),

  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
});

// Chat input validation schema
export const chatInputSchema = Yup.string()
  .required('Message cannot be empty')
  .trim()
  .min(1, 'Message cannot be empty')
  .max(500, 'Message must be less than 500 characters')
  .test('no-sql-keywords', 'Message contains potentially dangerous keywords', (value) => {
    if (!value) return true;
    const upperValue = value.toUpperCase();
    const dangerousPatterns = [
      'DROP TABLE',
      'DROP DATABASE',
      'DELETE FROM',
      'TRUNCATE',
      'ALTER TABLE',
      'EXEC(',
      'EXECUTE(',
      '<SCRIPT',
      'JAVASCRIPT:',
      'ONERROR=',
      'ONCLICK='
    ];
    return !dangerousPatterns.some(pattern => upperValue.includes(pattern));
  });

// Condition validation schema (Admin Panel)
export const conditionSchema = Yup.object().shape({
  name: Yup.string()
    .required('Condition name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-\/()&,]+$/, 'Name contains invalid characters'),

  category: Yup.string()
    .required('Category is required')
    .oneOf(['Surgical', 'Intra-Oral'], 'Invalid category'),

  pitch_points: Yup.string()
    .max(2000, 'Pitch points must be less than 2000 characters')
    .nullable()
});

// Product validation schema (Admin Panel)
export const productSchema = Yup.object().shape({
  name: Yup.string()
    .required('Product name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-\/()&,.™®]+$/, 'Name contains invalid characters'),

  description: Yup.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
});

// Category validation schema (Admin Panel)
export const categorySchema = Yup.object().shape({
  name: Yup.string()
    .required('Category name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .matches(/^[a-zA-Z0-9\s\-]+$/, 'Name can only contain letters, numbers, spaces, and hyphens')
});

// Feedback validation schema
export const feedbackSchema = Yup.object().shape({
  type: Yup.string()
    .required('Feedback type is required')
    .oneOf(['bug', 'feature', 'question'], 'Invalid feedback type'),

  description: Yup.string()
    .required('Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),

  location: Yup.string()
    .max(255, 'Location must be less than 255 characters')
    .nullable()
});

// Research article validation schema (Admin Panel)
export const researchArticleSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .min(5, 'Title must be at least 5 characters')
    .max(500, 'Title must be less than 500 characters'),

  author: Yup.string()
    .max(255, 'Author must be less than 255 characters')
    .nullable(),

  abstract: Yup.string()
    .max(5000, 'Abstract must be less than 5000 characters')
    .nullable(),

  url: Yup.string()
    .url('Must be a valid URL')
    .max(2000, 'URL must be less than 2000 characters')
    .nullable()
});

// Competitive advantage validation schema (Admin Panel)
export const competitiveAdvantageSchema = Yup.object().shape({
  product_name: Yup.string()
    .required('Product name is required')
    .max(100, 'Product name must be less than 100 characters'),

  competitor_name: Yup.string()
    .max(100, 'Competitor name must be less than 100 characters')
    .nullable(),

  ingredient_name: Yup.string()
    .max(100, 'Ingredient name must be less than 100 characters')
    .nullable(),

  advantages: Yup.string()
    .required('Advantages are required')
    .min(10, 'Advantages must be at least 10 characters')
    .max(5000, 'Advantages must be less than 5000 characters')
});

// Helper function to validate and sanitize input
export const validateAndSanitize = async (schema, data) => {
  try {
    // Validate
    const validatedData = await schema.validate(data, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });

    // Sanitize string fields (trim whitespace)
    const sanitized = {};
    for (const [key, value] of Object.entries(validatedData)) {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }

    return { success: true, data: sanitized };
  } catch (error) {
    if (error.name === 'ValidationError') {
      // Format Yup errors for display
      const errors = error.inner.reduce((acc, err) => {
        acc[err.path] = err.message;
        return acc;
      }, {});

      return {
        success: false,
        errors,
        message: error.errors[0] || 'Validation failed'
      };
    }
    throw error;
  }
};

// Export individual field validators for inline validation
export const validators = {
  email: (value) => {
    try {
      Yup.string().email().required().validateSync(value);
      return null;
    } catch (error) {
      return error.message;
    }
  },

  password: (value) => {
    try {
      Yup.string().min(8).required().validateSync(value);
      return null;
    } catch (error) {
      return error.message;
    }
  },

  required: (value) => {
    try {
      Yup.string().required().validateSync(value);
      return null;
    } catch (error) {
      return error.message;
    }
  },

  maxLength: (value, max) => {
    try {
      Yup.string().max(max).validateSync(value);
      return null;
    } catch (error) {
      return error.message;
    }
  }
};
