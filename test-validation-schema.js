// Test script to verify Joi schema validation works correctly
import Joi from 'joi';

const createAnnouncementSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.string().min(10).max(5000).required(),
  type: Joi.string().valid('info', 'warning', 'urgent', 'event', 'maintenance').default('info'),
  target_role: Joi.string().valid('all', 'student', 'counsellor', 'admin').default('all'),
  duration_days: Joi.number().integer().min(1).max(365).required()
});

// Test case 1: Valid minimal data (only required fields)
const testCase1 = {
  title: "Test Announcement",
  content: "This is a test announcement with enough content",
  duration_days: 7
};

console.log('\n=== TEST CASE 1: Valid Minimal Data ===');
console.log('Input:', testCase1);
const result1 = createAnnouncementSchema.validate(testCase1, {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true
});
console.log('Errors:', result1.error ? result1.error.details : 'None');
console.log('Value:', result1.value);

// Test case 2: With all fields
const testCase2 = {
  title: "Test Announcement",
  content: "This is a test announcement with enough content",
  duration_days: 7,
  type: 'event',
  target_role: 'all'
};

console.log('\n=== TEST CASE 2: All Fields ===');
console.log('Input:', testCase2);
const result2 = createAnnouncementSchema.validate(testCase2, {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true
});
console.log('Errors:', result2.error ? result2.error.details : 'None');
console.log('Value:', result2.value);

// Test case 3: Invalid - short title
const testCase3 = {
  title: "AB",
  content: "This is a test announcement with enough content",
  duration_days: 7
};

console.log('\n=== TEST CASE 3: Invalid Title (too short) ===');
console.log('Input:', testCase3);
const result3 = createAnnouncementSchema.validate(testCase3, {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true
});
console.log('Errors:', result3.error ? result3.error.details.map(e => ({ field: e.path.join('.'), message: e.message })) : 'None');

// Test case 4: Invalid - short content
const testCase4 = {
  title: "Test",
  content: "short",
  duration_days: 7
};

console.log('\n=== TEST CASE 4: Invalid Content (too short) ===');
console.log('Input:', testCase4);
const result4 = createAnnouncementSchema.validate(testCase4, {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true
});
console.log('Errors:', result4.error ? result4.error.details.map(e => ({ field: e.path.join('.'), message: e.message })) : 'None');

// Test case 5: Invalid - duration out of range
const testCase5 = {
  title: "Test Announcement",
  content: "This is a test announcement with enough content",
  duration_days: 1000
};

console.log('\n=== TEST CASE 5: Invalid Duration (out of range) ===');
console.log('Input:', testCase5);
const result5 = createAnnouncementSchema.validate(testCase5, {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true
});
console.log('Errors:', result5.error ? result5.error.details.map(e => ({ field: e.path.join('.'), message: e.message })) : 'None');

// Test case 6: Extra unknown field
const testCase6 = {
  title: "Test Announcement",
  content: "This is a test announcement with enough content",
  duration_days: 7,
  unknownField: "should be stripped"
};

console.log('\n=== TEST CASE 6: Unknown Field (should be stripped) ===');
console.log('Input:', testCase6);
const result6 = createAnnouncementSchema.validate(testCase6, {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: true
});
console.log('Errors:', result6.error ? result6.error.details : 'None');
console.log('Value (should have unknown field removed):', result6.value);

console.log('\n=== SUMMARY ===');
console.log('All schema validation tests completed');
