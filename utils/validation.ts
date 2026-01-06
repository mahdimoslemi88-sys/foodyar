// utils/validation.ts

export type ValidationRules<T> = {
  [K in keyof T]?: {
    required?: boolean;
    min?: number;
    max?: number;
    isNumber?: boolean;
    isPositive?: boolean; // Shorthand for value > 0
    pattern?: {
        value: RegExp;
        message: string;
    };
    validate?: (value: T[K], allValues: T) => string | null;
  };
};

export const validate = <T extends object>(
  values: T,
  rules: ValidationRules<T>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const key in rules) {
    const value = values[key as keyof T];
    const rule = rules[key as keyof T];

    if (!rule) continue;

    if (rule.required && (value === null || value === undefined || value === '')) {
      errors[key] = 'این فیلد الزامی است.';
      continue;
    }
    
    // Skip other validations if field is not required and is empty
    if (!rule.required && (value === null || value === undefined || value === '')) {
      continue;
    }
    
    const numValue = Number(value);

    if (rule.isNumber && isNaN(numValue)) {
      errors[key] = 'مقدار باید یک عدد باشد.';
      continue;
    }

    if (rule.isPositive && numValue <= 0) {
      errors[key] = 'مقدار باید بیشتر از صفر باشد.';
      continue;
    }

    if (rule.min !== undefined && numValue < rule.min) {
      errors[key] = `مقدار باید حداقل ${rule.min} باشد.`;
      continue;
    }

    if (rule.max !== undefined && numValue > rule.max) {
      errors[key] = `مقدار نمی‌تواند بیشتر از ${rule.max} باشد.`;
      continue;
    }

    if (rule.pattern && typeof value === 'string' && !rule.pattern.value.test(value)) {
        errors[key] = rule.pattern.message;
        continue;
    }
    
    if (rule.validate) {
        const errorMessage = rule.validate(value, values);
        if (errorMessage) {
            errors[key] = errorMessage;
        }
    }
  }

  return errors;
};
