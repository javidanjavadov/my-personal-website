
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const messageInput = document.getElementById('message');
  const honeypotInput = document.getElementById('website');
  const statusText = document.getElementById('formStatus');
  const submitButton = document.getElementById('submitButton');

  const toggleError = (inputEl, errorElId, show, message = '') => {
    const errorEl = document.getElementById(errorElId);
    if (show) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
      inputEl.classList.add('border-red-600');
    } else {
      errorEl.classList.add('hidden');
      inputEl.classList.remove('border-red-600');
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    statusText.textContent = '';
    statusText.className = '';

    toggleError(nameInput, 'nameError', false);
    toggleError(emailInput, 'emailError', false);
    toggleError(messageInput, 'messageError', false);

    let valid = true;
    if (honeypotInput.value.trim() !== '') {
      return;
    }
    if (nameInput.value.trim() === '') {
      toggleError(nameInput, 'nameError', true, 'Please enter your name.');
      valid = false;
    }
    if (emailInput.value.trim() === '') {
      toggleError(emailInput, 'emailError', true, 'Please enter your email.');
      valid = false;
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailInput.value.trim())) {
        toggleError(emailInput, 'emailError', true, 'Please enter a valid email address.');
        valid = false;
      }
    }
    if (messageInput.value.trim() === '') {
      toggleError(messageInput, 'messageError', true, 'Please enter your message.');
      valid = false;
    }

    if (!valid) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';

    const formData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      message: messageInput.value.trim()
    };

    try {
      const response = await fetch('https://my-personal-website-backend.onrender.com/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (response.ok) {
        statusText.textContent = 'Thank you! Your message has been sent.';
        statusText.classList.add('text-green-600');
        form.reset();
      } else {
        statusText.textContent = result.error || 'An error occurred. Please try again later.';
        statusText.classList.add('text-red-600');
      }
    } catch (err) {
      statusText.textContent = 'An error occurred. Please try again later.';
      statusText.classList.add('text-red-600');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send';
    }
  });
});
