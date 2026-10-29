
const $ = (selector) => document.querySelector(selector);

let activeAction = "deposit";

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            showLogin();
        }
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}

function showMessage(element, message, type = "success") {
    element.textContent = message;
    element.className = `message ${type}`;
}

function formatMoney(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(amount);
}

function showDashboard() {
    $("#loginScreen").hidden = true;
    $("#dashboard").hidden = false;
    $("#loginMessage").textContent = "";
    $("#pin").value = "";
    loadBalance();
    loadHistory();
}

function showLogin() {
    $("#dashboard").hidden = true;
    $("#loginScreen").hidden = false;
    $("#transactionPanel").hidden = true;
}

$("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const pin = $("#pin").value.trim();

    if (!/^\d{4}$/.test(pin)) {
        showMessage($("#loginMessage"), "Enter a four-digit PIN.", "error");
        return;
    }

    try {
        await api("/api/login", {
            method: "POST",
            body: JSON.stringify({ pin })
        });

        showDashboard();
    } catch (error) {
        showMessage($("#loginMessage"), error.message, "error");
    }
});

async function loadBalance() {
    try {
        const data = await api("/api/balance");
        $("#balance").textContent = formatMoney(data.balance);
    } catch (error) {
        showMessage($("#dashboardMessage"), error.message, "error");
    }
}

async function loadHistory() {
    try {
        const data = await api("/api/transactions");
        const history = $("#historyList");

        if (!data.transactions.length) {
            history.innerHTML =
            '<p class="empty-state">No transactions yet.</p>';
            return;
        }

        history.replaceChildren();

        data.transactions.forEach((transaction) => {
            const row = document.createElement("div");
            row.className = "history-item";

            const details = document.createElement("div");
            const title = document.createElement("div");
            title.className = "history-type";
            title.textContent = transaction.type;

            const meta = document.createElement("div");
            meta.className = "history-meta";
            meta.textContent =
            `Balance after transaction: ${formatMoney(transaction.balance)}`;

            details.append(title, meta);

            const amount = document.createElement("div");
            const isDeposit = transaction.type === "Deposit";
            amount.className = `history-amount ${isDeposit ? "positive" : "negative"}`;
            amount.textContent =
            `${isDeposit ? "+" : "−"}${formatMoney(transaction.amount)}`;

            row.append(details, amount);
            history.appendChild(row);
        });
    } catch (error) {
        showMessage($("#dashboardMessage"), error.message, "error");
    }
}

document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
        const action = button.dataset.action;

        if (action === "balance") {
            try {
                await loadBalance();
                showMessage($("#dashboardMessage"),
                            "Your balance has been updated.", "success");
            } catch (error) {
                showMessage($("#dashboardMessage"), error.message, "error");
            }
            return;
        }

        activeAction = action;
        $("#transactionTitle").textContent =
        action === "deposit" ? "Deposit Money" : "Withdraw Money";

        $("#submitTransaction").textContent =
        action === "deposit" ? "Deposit Funds →" : "Withdraw Funds →";

        $("#transactionPanel").hidden = false;
        $("#amount").value = "";
        $("#amount").focus();
        $("#transactionPanel").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
});

$("#closePanel").addEventListener("click", () => {
    $("#transactionPanel").hidden = true;
});

document.querySelectorAll("[data-amount]").forEach((button) => {
    button.addEventListener("click", () => {
        $("#amount").value = button.dataset.amount;
    });
});

$("#transactionForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const amount = Number($("#amount").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage($("#dashboardMessage"),
                    "Enter an amount greater than zero.", "error");
        return;
    }

    const submitButton = $("#submitTransaction");
    submitButton.disabled = true;

    try {
        const result = await api("/api/transaction", {
            method: "POST",
            body: JSON.stringify({
                action: activeAction,
                amount
            })
        });

        $("#balance").textContent = formatMoney(result.balance);

        showMessage(
            $("#dashboardMessage"),
                    `${result.message} New balance: ${formatMoney(result.balance)}`,
                    "success"
        );

        $("#transactionPanel").hidden = true;
        await loadHistory();
    } catch (error) {
        showMessage($("#dashboardMessage"), error.message, "error");
    } finally {
        submitButton.disabled = false;
    }
});

$("#refreshHistory").addEventListener("click", loadHistory);

$("#logoutBtn").addEventListener("click", async () => {
    try {
        await api("/api/logout", { method: "POST" });
        showLogin();
        showMessage($("#loginMessage"), "You have logged out.", "success");
    } catch (error) {
        showMessage($("#dashboardMessage"), error.message, "error");
    }
});
