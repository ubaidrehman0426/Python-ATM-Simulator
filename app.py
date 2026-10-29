
from flask import Flask, render_template, request, jsonify, session
from functools import wraps

app = Flask(__name__)
app.secret_key = "change-this-secret-key"

USER_PIN = "1234"
INITIAL_BALANCE = 1000.00


def login_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not session.get("authenticated"):
            return jsonify({"success": False, "message": "Please log in first."}), 401
        return func(*args, **kwargs)
    return wrapper


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/login", methods=["POST"])
def login():
    pin = str(request.json.get("pin", ""))

    if pin != USER_PIN:
        return jsonify({"success": False, "message": "Invalid PIN."}), 401

    session["authenticated"] = True
    session["balance"] = INITIAL_BALANCE
    session["transactions"] = []

    return jsonify({"success": True, "message": "Login successful."})


@app.route("/api/balance", methods=["GET"])
@login_required
def balance():
    return jsonify({"balance": session.get("balance", INITIAL_BALANCE)})


@app.route("/api/transaction", methods=["POST"])
@login_required
def transaction():
    data = request.get_json(silent=True) or {}
    action = data.get("action")
    amount = data.get("amount")

    if action not in ("deposit", "withdraw"):
        return jsonify({"success": False, "message": "Invalid transaction."}), 400

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Enter a valid amount."}), 400

    if amount <= 0 or not amount < float("inf"):
        return jsonify({"success": False, "message": "Amount must be greater than zero."}), 400

    current_balance = float(session.get("balance", INITIAL_BALANCE))

    if action == "withdraw" and amount > current_balance:
        return jsonify({"success": False, "message": "Insufficient balance."}), 400

    if action == "deposit":
        current_balance += amount
    else:
        current_balance -= amount

    session["balance"] = round(current_balance, 2)

    transactions = session.get("transactions", [])
    transactions.insert(0, {
        "type": action.title(),
        "amount": round(amount, 2),
        "balance": session["balance"]
    })
    session["transactions"] = transactions[:10]

    return jsonify({
        "success": True,
        "message": f"{action.title()} successful.",
        "balance": session["balance"]
    })


@app.route("/api/transactions", methods=["GET"])
@login_required
def transaction_history():
    return jsonify({"transactions": session.get("transactions", [])})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True)
