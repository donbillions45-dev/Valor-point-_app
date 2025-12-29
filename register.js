// register.js

// Import necessary Firebase modules from your firebase.js file
import { auth, db, createUserWithEmailAndPassword, doc, setDoc, getDoc, updateDoc, arrayUnion } from './firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const registerForm = document.getElementById('registerForm');
const messageElement = document.getElementById('message');

// Function to generate a simple unique referral code
// This is a basic implementation; for production, consider more robust uniqueness checks
function generateReferralCode() {
    // Generates a random alphanumeric string (e.g., "A1B2C3")
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Event listener for form submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission behavior

    // Get values from the form fields
    const fullName = registerForm['fullName'].value;
    const email = registerForm['email'].value;
    const password = registerForm['password'].value;
    const referredByCode = registerForm['referralCode'].value.trim(); // Trim whitespace

    // Clear previous messages
    messageElement.textContent = '';
    messageElement.className = 'message'; // Reset classes

    try {
        // 1. Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user; // The newly created user object

        const newReferralCode = generateReferralCode(); // Generate a unique referral code for the new user

        // 2. Prepare user data for Firestore
        const userData = {
            uid: user.uid, // Firebase Authentication User ID
            name: fullName,
            email: email,
            balance: 0, // Initial balance
            referralCode: newReferralCode, // Unique code for this user
            referredBy: referredByCode || null, // Store who referred this user (null if none)
            referrals: [] // Array to store UIDs of users this user refers
        };

        // 3. Store user data in Firestore in the 'users' collection, using UID as document ID
        await setDoc(doc(db, 'users', user.uid), userData);
        
        // 4. Handle referral logic (if a referral code was provided)
        if (referredByCode) {
            const usersRef = collection(db, 'users');
            // Query Firestore to find the referrer's document by their referralCode
            const q = query(usersRef, where('referralCode', '==', referredByCode));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const referrerDoc = querySnapshot.docs[0]; // Get the first matching referrer
                const referrerData = referrerDoc.data();
                const referrerUid = referrerDoc.id; // Get the document ID (which is the UID) of the referrer

                // Update referrer's balance and add the new user's UID to their referrals array
                await updateDoc(doc(db, 'users', referrerUid), {
                    balance: referrerData.balance + 1500, // Add ₦1,500 to referrer's balance
                    referrals: arrayUnion(user.uid) // Add the new user's UID to the referrer's list
                });
                messageElement.textContent = `Registration successful! You were referred by ${referredByCode}. Referrer's balance updated.`;
                messageElement.classList.add('success');
            } else {
                // If the provided referral code does not match any existing user's referral code
                messageElement.textContent = 'Registration successful, but the provided referral code was not found or is invalid.';
                messageElement.classList.add('success');
            }
        } else {
            // No referral code provided
            messageElement.textContent = 'Registration successful! Welcome to ValorPoint.';
            messageElement.classList.add('success');
        }

        // --- Important Note for a complete app ---
        // After successful registration, you'd typically redirect the user.
        // For example:
        // window.location.href = 'dashboard.html';
        // For now, we'll just show the success message.

    } catch (error) {
        console.error("Error during registration:", error);
        let errorMessage = "An unknown error occurred. Please try again.";
        // Handle specific Firebase Authentication errors for better user feedback
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'The email address is already in use by another account.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'The email address is not valid.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'The password is too weak. It must be at least 6 characters long.';
        }
        messageElement.textContent = errorMessage;
        messageElement.classList.add('error');
    }
});