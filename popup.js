document.addEventListener('DOMContentLoaded', async () => {
    // 1. Define HTML elements
    const btn = document.getElementById('fixBtn');
    const statusDiv = document.getElementById('status');
    const inputField = document.getElementById('memberIdInput');

    // 2. Helper function to display messages with new styling
    function showStatus(message, type) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = message;
        // Set class based on message type (success, error, or loading)
        if (type === 'success') {
            statusDiv.className = 'status-success';
        } else if (type === 'loading') {
            statusDiv.className = 'status-loading';
        } else {
            statusDiv.className = 'status-error';
        }
    }

    // 3. Read current URL to auto-fill data
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Extract chapter ID and member ID from URL using Regex
    // URL Pattern example: .../chapter-12345/.../member-987654
    const chapterMatch = tab.url.match(/chapter-(\d+)/);
    const memberMatch = tab.url.match(/member-(\d+)/);

    // Store chapter ID as we'll need it for the API call
    let chapterId = chapterMatch ? chapterMatch[1] : null;

    // If we find member ID in URL, auto-fill the input field
    if (memberMatch) {
        inputField.value = memberMatch[1];
    }

    // 4. Button click event handler
    btn.addEventListener('click', async () => {
        const manualMemberId = inputField.value.trim();

        // Hide any previous status messages
        statusDiv.style.display = 'none';

        // --- Validation Stage ---
        if (!chapterId) {
            showStatus("Chapter ID not found. Make sure you're on the chapter dashboard.", 'error');
            return;
        }

        if (!manualMemberId) {
            showStatus("Please enter a Member ID or open a member page.", 'error');
            return;
        }

        // --- Loading Stage ---
        // Change button appearance to indicate loading
        const originalBtnText = btn.innerHTML;
        btn.innerHTML = '<span>⏳</span><span>Searching...</span>';
        btn.disabled = true; // Temporarily disable button
        showStatus("Fetching member data...", 'loading');

        try {
            // --- API Call Stage ---
            // Call the server to fetch hidden member data
            const response = await fetch(`https://gdg.community.dev/api/chapter/${chapterId}/member/${manualMemberId}`);

            if (!response.ok) {
                throw new Error("Server connection failed (HTTP Error)");
            }

            const data = await response.json();

            // --- Success Stage and ID Extraction ---
            if (data && data.user && data.user.id) {
                const hiddenUserId = data.user.id;

                showStatus(`Success! Found User ID: ${hiddenUserId}. Redirecting...`, 'success');

                // Open member addition page in new tab
                const targetUrl = `https://gdg.community.dev/accounts/dashboard/#/chapter-${chapterId}/settings/newmember-${hiddenUserId}`;
                chrome.tabs.create({ url: targetUrl });

            } else {
                showStatus("Data received but no User ID found. Member might not have joined the chapter.", 'error');
            }

        } catch (error) {
            console.error(error);
            showStatus("Error occurred! Make sure you're an Organizer with proper permissions and are logged in.", 'error');
        } finally {
            // Reset button to normal state regardless of success or failure
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    });
});