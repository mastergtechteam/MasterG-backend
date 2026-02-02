import AWS from 'aws-sdk';

const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.REGION || 'ap-south-1'
});

/**
 * Success response helper
 */
const successResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

/**
 * Error response helper
 */
const errorResponse = (statusCode, message, details = null) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify({
    success: false,
    message,
    ...(details && { details }),
  }),
});


/**
 * User signup
 * POST /auth/signup
 * Body: { email OR phone_number, password, name }
 * Note: Either email OR phone_number is required, not both
 */
export const signUp = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number, password, name } = body;
  
      // Validate inputs - either email or phone_number required
      if ((!email && !phone_number) || !password || !name) {
        return errorResponse(400, 'Missing required fields: (email or phone_number), password, name');
      }
  
      // Cannot provide both email and phone_number
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return errorResponse(400, 'Invalid email format');
        }
      }
  
      // Validate phone number format if provided (basic validation)
      if (phone_number) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phone_number.replace(/\s|-/g, ''))) {
          return errorResponse(400, 'Invalid phone number format. Use E.164 format: +country code + number');
        }
      }
  
      // Validate password strength
      if (password.length < 8) {
        return errorResponse(400, 'Password must be at least 8 characters');
      }
  
      if (!/[A-Z]/.test(password)) {
        return errorResponse(400, 'Password must contain at least one uppercase letter');
      }
  
      if (!/[a-z]/.test(password)) {
        return errorResponse(400, 'Password must contain at least one lowercase letter');
      }
  
      if (!/[0-9]/.test(password)) {
        return errorResponse(400, 'Password must contain at least one number');
      }
  
      const userAttributes = [
        { Name: 'name', Value: name }
      ];
  
      if (email) {
        userAttributes.push({ Name: 'email', Value: email });
      }
  
      if (phone_number) {
        userAttributes.push({ Name: 'phone_number', Value: phone_number });
      }
  
      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email || phone_number,
        Password: password,
        UserAttributes: userAttributes
      };
  
      const result = await cognito.signUp(params).promise();
  
      return successResponse(201, {
        success: true,
        message: 'User registered successfully. Check your email/SMS for confirmation code.',
        userId: result.UserSub,
        userConfirmed: false
      });
    } catch (error) {
      console.error('SignUp error:', error);
  
      if (error.code === 'UsernameExistsException') {
        return errorResponse(409, 'Email or phone number already registered');
      }
  
      if (error.code === 'InvalidPasswordException') {
        return errorResponse(400, 'Password does not meet requirements');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      return errorResponse(500, 'Signup failed', error.message);
    }
  };
  
  /**
   * User login
   * POST /auth/login
   * Body: { (email or phone_number), password }
   * Note: Provide either email or phone_number
   */
  export const signIn = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number, password } = body;
  
      // Validate inputs - either email or phone_number required
      if ((!email && !phone_number) || !password) {
        return errorResponse(400, 'Missing required fields: (email or phone_number), password');
      }
  
      // Cannot provide both
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      const username = email || phone_number;
  
      const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      };
  
      const result = await cognito.initiateAuth(params).promise();
  
      // Check if authentication was successful
      if (!result.AuthenticationResult) {
        return errorResponse(401, 'Authentication failed');
      }
  
      return successResponse(200, {
        success: true,
        message: 'Login successful',
        tokens: {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          expiresIn: result.AuthenticationResult.ExpiresIn
        }
      });
    } catch (error) {
      console.error('SignIn error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(401, 'Email or phone number not registered');
      }
  
      if (error.code === 'NotAuthorizedException') {
        return errorResponse(401, 'Invalid credentials');
      }
  
      if (error.code === 'UserNotConfirmedException') {
        return errorResponse(403, 'User email or phone not confirmed. Check your email/SMS for confirmation link.');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      return errorResponse(500, 'Login failed', error.message);
    }
  };