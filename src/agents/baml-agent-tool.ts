/**
 * BAML-Enhanced Agent Tool Base Class
 * 
 * Provides a foundation for all agent tools with built-in BAML schema validation,
 * type safety, and multi-model support. All agent tools should extend this class
 * to ensure consistent LLM interactions across the AutoSDLC system.
 */

import { BamlClientWrapper, BamlFunctionCall } from './baml-client-wrapper';

export interface ToolConfig {
  name: string;
  description: string;
  version: string;
  defaultModel?: string;
  temperature?: number;
  maxRetries?: number;
}

export interface ToolInput {
  [key: string]: any;
}

export interface ToolOutput<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: ToolMetadata;
}

export interface ToolMetadata {
  executionTime: number;
  modelUsed: string;
  tokensUsed?: number;
  retries: number;
  validationPassed: boolean;
}

export abstract class BamlAgentTool<TInput extends ToolInput = ToolInput, TOutput = any> {
  protected config: ToolConfig;
  protected bamlClient: BamlClientWrapper;

  constructor(config: ToolConfig, bamlClient: BamlClientWrapper) {
    this.config = config;
    this.bamlClient = bamlClient;
  }

  /**
   * Execute the tool with BAML validation and error handling
   */
  async execute(input: TInput): Promise<ToolOutput<TOutput>> {
    const startTime = Date.now();
    let retries = 0;
    let modelUsed = this.config.defaultModel || this.bamlClient.getConfig().defaultModel;
    let error: Error | null = null;

    try {
      // Validate input before execution
      const validatedInput = await this.validateInput(input);
      if (!validatedInput.isValid) {
        return {
          success: false,
          error: `Input validation failed: ${validatedInput.errors.join(', ')}`,
          metadata: {
            executionTime: Date.now() - startTime,
            modelUsed,
            retries,
            validationPassed: false
          }
        };
      }

      // Execute the tool-specific logic with BAML
      const bamlCall: BamlFunctionCall<TOutput> = {
        functionName: this.getBamlFunctionName(),
        input: this.transformInputForBaml(validatedInput.data),
        expectedOutput: this.getExpectedOutputType(),
        model: this.config.defaultModel,
        temperature: this.config.temperature
      };

      const result = await this.bamlClient.executeFunction<TOutput>(bamlCall);
      
      // Validate output
      const validatedOutput = await this.validateOutput(result);
      if (!validatedOutput.isValid) {
        return {
          success: false,
          error: `Output validation failed: ${validatedOutput.errors.join(', ')}`,
          metadata: {
            executionTime: Date.now() - startTime,
            modelUsed,
            retries,
            validationPassed: false
          }
        };
      }

      // Transform output if needed
      const transformedOutput = await this.transformOutput(validatedOutput.data);

      return {
        success: true,
        data: transformedOutput,
        metadata: {
          executionTime: Date.now() - startTime,
          modelUsed,
          retries,
          validationPassed: true
        }
      };
    } catch (err) {
      error = err as Error;
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTime: Date.now() - startTime,
          modelUsed,
          retries,
          validationPassed: false
        }
      };
    }
  }

  /**
   * Execute the tool with streaming support
   */
  async *executeStream(input: TInput): AsyncGenerator<Partial<TOutput>, ToolOutput<TOutput>, unknown> {
    const startTime = Date.now();
    const modelUsed = this.config.defaultModel || this.bamlClient.getConfig().defaultModel;

    try {
      // Validate input
      const validatedInput = await this.validateInput(input);
      if (!validatedInput.isValid) {
        return {
          success: false,
          error: `Input validation failed: ${validatedInput.errors.join(', ')}`,
          metadata: {
            executionTime: Date.now() - startTime,
            modelUsed,
            retries: 0,
            validationPassed: false
          }
        };
      }

      // Create BAML streaming call
      const bamlCall: BamlFunctionCall<TOutput> = {
        functionName: this.getBamlFunctionName(),
        input: this.transformInputForBaml(validatedInput.data),
        expectedOutput: this.getExpectedOutputType(),
        model: this.config.defaultModel,
        temperature: this.config.temperature
      };

      // Stream results
      const stream = this.bamlClient.executeFunctionStream<TOutput>(bamlCall);
      let finalResult: TOutput | null = null;

      for await (const partial of stream) {
        yield partial;
        finalResult = partial as TOutput;
      }

      if (finalResult) {
        // Validate final output
        const validatedOutput = await this.validateOutput(finalResult);
        if (!validatedOutput.isValid) {
          return {
            success: false,
            error: `Output validation failed: ${validatedOutput.errors.join(', ')}`,
            metadata: {
              executionTime: Date.now() - startTime,
              modelUsed,
              retries: 0,
              validationPassed: false
            }
          };
        }

        const transformedOutput = await this.transformOutput(validatedOutput.data);
        return {
          success: true,
          data: transformedOutput,
          metadata: {
            executionTime: Date.now() - startTime,
            modelUsed,
            retries: 0,
            validationPassed: true
          }
        };
      }

      return {
        success: false,
        error: 'No result received from stream',
        metadata: {
          executionTime: Date.now() - startTime,
          modelUsed,
          retries: 0,
          validationPassed: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        metadata: {
          executionTime: Date.now() - startTime,
          modelUsed,
          retries: 0,
          validationPassed: false
        }
      };
    }
  }

  /**
   * Get tool configuration
   */
  getConfig(): Readonly<ToolConfig> {
    return { ...this.config };
  }

  /**
   * Update tool configuration
   */
  updateConfig(updates: Partial<ToolConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // Abstract methods that must be implemented by concrete tools

  /**
   * Get the BAML function name for this tool
   */
  protected abstract getBamlFunctionName(): string;

  /**
   * Get the expected output type constructor
   */
  protected abstract getExpectedOutputType(): new () => TOutput;

  /**
   * Validate input before execution
   */
  protected abstract validateInput(input: TInput): Promise<ValidationResult<TInput>>;

  /**
   * Transform input for BAML function call
   */
  protected abstract transformInputForBaml(input: TInput): any;

  /**
   * Validate output after execution
   */
  protected abstract validateOutput(output: TOutput): Promise<ValidationResult<TOutput>>;

  /**
   * Transform output before returning (optional)
   */
  protected async transformOutput(output: TOutput): Promise<TOutput> {
    // Default implementation returns output as-is
    return output;
  }
}

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data: T;
  errors: string[];
  warnings?: string[];
}

/**
 * Base validation helper functions
 */
export class ValidationHelpers {
  /**
   * Validate required fields are present
   */
  static validateRequiredFields<T extends object>(
    data: T,
    requiredFields: (keyof T)[]
  ): string[] {
    const errors: string[] = [];
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        errors.push(`Missing required field: ${String(field)}`);
      }
    }
    return errors;
  }

  /**
   * Validate field types
   */
  static validateFieldTypes<T extends object>(
    data: T,
    fieldTypes: { [K in keyof T]?: string }
  ): string[] {
    const errors: string[] = [];
    for (const [field, expectedType] of Object.entries(fieldTypes) as [keyof T, string][]) {
      const actualType = typeof data[field];
      if (data[field] !== undefined && actualType !== expectedType) {
        errors.push(`Field ${String(field)} must be of type ${expectedType}, got ${actualType}`);
      }
    }
    return errors;
  }

  /**
   * Validate string length
   */
  static validateStringLength(
    value: string,
    field: string,
    min?: number,
    max?: number
  ): string[] {
    const errors: string[] = [];
    if (min !== undefined && value.length < min) {
      errors.push(`${field} must be at least ${min} characters long`);
    }
    if (max !== undefined && value.length > max) {
      errors.push(`${field} must be at most ${max} characters long`);
    }
    return errors;
  }

  /**
   * Validate number range
   */
  static validateNumberRange(
    value: number,
    field: string,
    min?: number,
    max?: number
  ): string[] {
    const errors: string[] = [];
    if (min !== undefined && value < min) {
      errors.push(`${field} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      errors.push(`${field} must be at most ${max}`);
    }
    return errors;
  }

  /**
   * Validate array items
   */
  static validateArray<T>(
    array: T[],
    field: string,
    minLength?: number,
    maxLength?: number,
    itemValidator?: (item: T, index: number) => string[]
  ): string[] {
    const errors: string[] = [];
    
    if (minLength !== undefined && array.length < minLength) {
      errors.push(`${field} must have at least ${minLength} items`);
    }
    if (maxLength !== undefined && array.length > maxLength) {
      errors.push(`${field} must have at most ${maxLength} items`);
    }
    
    if (itemValidator) {
      array.forEach((item, index) => {
        const itemErrors = itemValidator(item, index);
        errors.push(...itemErrors.map(err => `${field}[${index}]: ${err}`));
      });
    }
    
    return errors;
  }

  /**
   * Validate enum value
   */
  static validateEnum<T>(
    value: T,
    field: string,
    allowedValues: T[]
  ): string[] {
    const errors: string[] = [];
    if (!allowedValues.includes(value)) {
      errors.push(`${field} must be one of: ${allowedValues.join(', ')}`);
    }
    return errors;
  }
}