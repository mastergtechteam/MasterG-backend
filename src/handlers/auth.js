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

  /**
 * Refresh access token
 * POST /auth/refresh-token
 * Body: { refreshToken }
 * Returns: New access token, id token, and expiration time
 */
export const refreshToken = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { refreshToken: refresh } = body;
  
      // Validate refresh token
      if (!refresh) {
        return errorResponse(400, 'Missing required field: refreshToken');
      }
  
      const params = {
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refresh
        }
      };
  
      const result = await cognito.initiateAuth(params).promise();
  
      // Check if token refresh was successful
      if (!result.AuthenticationResult) {
        return errorResponse(401, 'Failed to refresh token');
      }
  
      return successResponse(200, {
        success: true,
        message: 'Token refreshed successfully',
        tokens: {
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          expiresIn: result.AuthenticationResult.ExpiresIn
        }
      });
    } catch (error) {
      console.error('RefreshToken error:', error);
  
      if (error.code === 'NotAuthorizedException') {
        return errorResponse(401, 'Refresh token is invalid or expired');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'User not found');
      }
  
      return errorResponse(500, 'Failed to refresh token', error.message);
    }
  };

  /**
 * Confirm user email/phone with OTP code
 * POST /auth/confirm
 * Body: { (email or phone_number), confirmationCode }
 * Note: Provide either email or phone_number
 */
export const confirmSignUp = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number, confirmationCode } = body;
  
      // Validate inputs
      if ((!email && !phone_number) || !confirmationCode) {
        return errorResponse(400, 'Missing required fields: (email or phone_number), confirmationCode');
      }
  
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      const username = email || phone_number;
  
      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode.toString()
      };
  
      await cognito.confirmSignUp(params).promise();
  
      return successResponse(200, {
        success: true,
        message: 'Email/Phone confirmed successfully. You can now login.'
      });
    } catch (error) {
      console.error('ConfirmSignUp error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'Email or phone number not registered');
      }
  
      if (error.code === 'CodeMismatchException') {
        return errorResponse(400, 'Invalid confirmation code');
      }
  
      if (error.code === 'ExpiredCodeException') {
        return errorResponse(400, 'Confirmation code has expired. Please request a new one.');
      }
  
      if (error.code === 'UserAlreadyConfirmedException') {
        return errorResponse(400, 'User email/phone already confirmed');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      return errorResponse(500, 'Email/Phone confirmation failed', error.message);
    }
  };

/**
 * Resend confirmation code to email or SMS
 * POST /auth/resend-code
 * Body: { email or phone_number }
 * Note: Provide either email or phone_number
 */
export const resendConfirmationCode = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number } = body;
  
      // Validate inputs
      if (!email && !phone_number) {
        return errorResponse(400, 'Missing required field: email or phone_number');
      }
  
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      const username = email || phone_number;
  
      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: username
      };
  
      await cognito.resendConfirmationCode(params).promise();
  
      return successResponse(200, {
        success: true,
        message: 'Confirmation code resent to your email or phone'
      });
    } catch (error) {
      console.error('ResendConfirmationCode error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'Email or phone number not registered');
      }
  
      if (error.code === 'UserAlreadyConfirmedException') {
        return errorResponse(400, 'User email/phone already confirmed');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'LimitExceededException') {
        return errorResponse(429, 'Too many requests. Please try again later.');
      }
  
      return errorResponse(500, 'Resend confirmation code failed', error.message);
    }
  };

/**
 * Admin confirm user (without confirmation code)
 * POST /auth/admin-confirm
 * Body: { email or phone_number }
 * Note: Provide either email or phone_number
 * This endpoint is meant for admin operations to confirm users directly
 */
export const adminConfirmUser = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number } = body;
  
      // Validate inputs - either email or phone_number required
      if (!email && !phone_number) {
        return errorResponse(400, 'Missing required field: email or phone_number');
      }
  
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      const username = email || phone_number;
  
      // Get the user pool ID from the client ID
      const userPoolId = process.env.USER_POOL_ID;
  
      if (!userPoolId) {
        console.error('USER_POOL_ID environment variable not set');
        return errorResponse(500, 'Server configuration error');
      }
  
      const params = {
        UserPoolId: userPoolId,
        Username: username
      };
  
      await cognito.adminConfirmSignUp(params).promise();
  
      return successResponse(200, {
        success: true,
        message: `User ${username} confirmed successfully. They can now login.`,
        confirmedUser: username
      });
    } catch (error) {
      console.error('AdminConfirmUser error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'Email or phone number not registered');
      }
  
      if (error.code === 'UserAlreadyConfirmedException') {
        return errorResponse(400, 'User email/phone already confirmed');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'NotAuthorizedException') {
        return errorResponse(403, 'Not authorized to perform this action');
      }
  
      return errorResponse(500, 'User confirmation failed', error.message);
    }
  };

/**
 * Initiate forgot password flow
 * POST /auth/forgot-password
 * Body: { email or phone_number }
 * Note: Provide either email or phone_number
 */
export const forgotPassword = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number } = body;
  
      // Validate inputs - either email or phone_number required
      if (!email && !phone_number) {
        return errorResponse(400, 'Missing required field: email or phone_number');
      }
  
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      const username = email || phone_number;
  
      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: username
      };
  
      const result = await cognito.forgotPassword(params).promise();
  
      return successResponse(200, {
        success: true,
        message: 'Password reset code has been sent to your email or phone number',
        codeDeliveryDetails: {
          destination: result.CodeDeliveryDetails?.Destination,
          deliveryMedium: result.CodeDeliveryDetails?.DeliveryMedium,
          attributeName: result.CodeDeliveryDetails?.AttributeName
        }
      });
    } catch (error) {
      console.error('ForgotPassword error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'Email or phone number not registered');
      }
  
      if (error.code === 'UserNotConfirmedException') {
        return errorResponse(403, 'User email or phone not confirmed. Please confirm your account first.');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'LimitExceededException') {
        return errorResponse(429, 'Too many requests. Please try again later.');
      }
  
      return errorResponse(500, 'Failed to initiate password reset', error.message);
    }
  };
  
  /**
   * Confirm new password with reset code
   * POST /auth/reset-password
   * Body: { (email or phone_number), confirmationCode, newPassword }
   * Note: Provide either email or phone_number
   */
  export const resetPassword = async (event) => {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, phone_number, confirmationCode, newPassword } = body;
  
      // Validate inputs - either email or phone_number required
      if ((!email && !phone_number) || !confirmationCode || !newPassword) {
        return errorResponse(400, 'Missing required fields: (email or phone_number), confirmationCode, newPassword');
      }
  
      if (email && phone_number) {
        return errorResponse(400, 'Provide either email or phone_number, not both');
      }
  
      // Validate password strength
      if (newPassword.length < 8) {
        return errorResponse(400, 'Password must be at least 8 characters');
      }
  
      if (!/[A-Z]/.test(newPassword)) {
        return errorResponse(400, 'Password must contain at least one uppercase letter');
      }
  
      if (!/[a-z]/.test(newPassword)) {
        return errorResponse(400, 'Password must contain at least one lowercase letter');
      }
  
      if (!/[0-9]/.test(newPassword)) {
        return errorResponse(400, 'Password must contain at least one number');
      }
  
      const username = email || phone_number;
  
      const params = {
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: username,
        ConfirmationCode: confirmationCode.toString(),
        Password: newPassword
      };
  
      await cognito.confirmForgotPassword(params).promise();
  
      return successResponse(200, {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.'
      });
    } catch (error) {
      console.error('ResetPassword error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'Email or phone number not registered');
      }
  
      if (error.code === 'CodeMismatchException') {
        return errorResponse(400, 'Invalid or expired reset code');
      }
  
      if (error.code === 'ExpiredCodeException') {
        return errorResponse(400, 'Reset code has expired. Please request a new one.');
      }
  
      if (error.code === 'InvalidPasswordException') {
        return errorResponse(400, 'Password does not meet requirements');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'LimitExceededException') {
        return errorResponse(429, 'Too many attempts. Please try again later.');
      }
  
      return errorResponse(500, 'Password reset failed', error.message);
    }
  };
  
  /**
   * List all onboarded Cognito users
   * GET /auth/users
   * Query: { limit (optional, default 60, max 60), paginationToken (optional) }
   * Requires: No authorization (can be restricted via API Gateway)
   */
  export const listCognitoUsers = async (event) => {
    try {
      const userPoolId = process.env.USER_POOL_ID;
      if (!userPoolId) {
        return errorResponse(500, 'User pool ID not configured');
      }
  
      // Get pagination parameters from query string
      const limit = Math.min(
        parseInt(event.queryStringParameters?.limit || '60'),
        60 // AWS Cognito max limit
      );
      const paginationToken = event.queryStringParameters?.paginationToken || null;
  
      // Build list users parameters
      const listParams = {
        UserPoolId: userPoolId,
        Limit: limit,
        ...(paginationToken && { PaginationToken: paginationToken })
      };
  
      // List users from Cognito
      const response = await cognito.listUsers(listParams).promise();
  
      // Transform user data for response
      const users = response.Users.map(user => {
        const attributes = {};
        
        // Convert attribute array to object
        if (user.Attributes) {
          user.Attributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
          });
        }
  
        return {
          userId: user.Username,
          email: attributes['email'] || null,
          phoneNumber: attributes['phone_number'] || null,
          name: attributes['name'] || null,
          emailVerified: attributes['email_verified'] === 'true',
          phoneNumberVerified: attributes['phone_number_verified'] === 'true',
          status: user.UserStatus, // UNCONFIRMED, CONFIRMED, ARCHIVED, COMPROMISED, UNKNOWN
          createdAt: user.UserCreateDate ? user.UserCreateDate.getTime() : null,
          updatedAt: user.UserLastModifiedDate ? user.UserLastModifiedDate.getTime() : null,
          mfaOptions: user.MFAOptions || [],
          enabled: user.Enabled,
          attributes
        };
      });
  
      return successResponse(200, {
        success: true,
        data: {
          users,
          count: users.length,
          paginationToken: response.PaginationToken || null,
          totalRecords: response.Users.length
        },
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      console.error('ListCognitoUsers error:', error);
  
      if (error.code === 'UserPoolNotFoundException') {
        return errorResponse(404, 'User pool not found');
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'TooManyRequestsException') {
        return errorResponse(429, 'Too many requests. Please try again later.');
      }
  
      if (error.code === 'NotAuthorizedException') {
        return errorResponse(403, 'Not authorized to list users');
      }
  
      return errorResponse(500, 'Failed to list users', error.message);
    }
  };
  
  /**
   * Delete a user completely from Cognito User Pool
   * DELETE /auth/users/{username}
   * Requires admin permissions
   * Deletes the user account and all associated data from Cognito
   */
  export const deleteUser = async (event) => {
    try {
      const { username } = event.pathParameters || {};
      const userPoolId = process.env.USER_POOL_ID;
  
      if (!username) {
        return errorResponse(400, 'Username is required in path parameters');
      }
  
      if (!userPoolId) {
        return errorResponse(500, 'User pool ID not configured');
      }
  
      // Delete user from Cognito User Pool
      const deleteParams = {
        UserPoolId: userPoolId,
        Username: username
      };
  
      await cognito.adminDeleteUser(deleteParams).promise();
  
      return successResponse(200, {
        success: true,
        message: `User '${username}' has been permanently deleted from Cognito`,
        username
      });
    } catch (error) {
      console.error('DeleteUser error:', error);
  
      if (error.code === 'UserNotFoundException') {
        return errorResponse(404, 'User not found in Cognito User Pool', { username: event.pathParameters?.username });
      }
  
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid parameters', error.message);
      }
  
      if (error.code === 'TooManyRequestsException') {
        return errorResponse(429, 'Too many requests. Please try again later.');
      }
  
      if (error.code === 'NotAuthorizedException') {
        return errorResponse(403, 'Not authorized to delete users');
      }
  
      if (error.code === 'UserPoolNotFoundException') {
        return errorResponse(404, 'User pool not found');
      }
  
      return errorResponse(500, 'Failed to delete user', error.message);
    }
  };