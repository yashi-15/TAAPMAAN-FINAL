async function paymentStart(event) {
    event.preventDefault();
    const uncleanedAmount = document.getElementById("modal-price").value;
    // const numericAmount = parseFloat(amount);
    const amount = uncleanedAmount.replace(/[^\d.]/g, ''); // Keeps only digits and decimal points

    console.log(amount)

    if (!amount || isNaN(amount)) {
        console.log(amount)
        alert("Please enter a valid amount!");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/createOrder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: parseFloat(amount) }),
        });

        const data = await response.json();
        if (!data.success) {
            alert("Failed to create order. Please try again!");
            return;
        }

        const options = {
            key: "rzp_live_BSOxL08MrkmXlw",
            amount: data.order.amount,
            currency: data.order.currency,
            name: "Truck Payment",
            description: "Test Transaction",
            order_id: data.order.id,
            handler: function (response) {
                fetch("http://localhost:3000/updatePaymentStatus", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ paymentStatus: "success", orderId: data.order.id }),
                })
                    .then(() => {
                        alert("Payment successfully completed!");
                        window.location.href = "index.html?paymentStatus=success";
                    })
                    .catch((err) => console.error("Error updating payment status:", err));
            },
            prefill: {
                name: "John Doe",
                email: "john.doe@example.com",
                contact: "9999999999",
            },
            theme: { color: "#3399cc" },
        };

        const rzp = new Razorpay(options);

        // Payment failed handler
        rzp.on("payment.failed", function (response) {
            alert("Payment Unsuccessful!");

            fetch("http://localhost:3000/updatePaymentStatus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ paymentStatus: "failed", orderId: data.order.id }),
            }).catch((err) => console.error("Error updating payment status:", err));

            const tryAgain = confirm("Payment failed. Want to try again?");
            if (tryAgain) {
                paymentStart();
            } else {
                alert("Payment process canceled.");
            }
        });

        rzp.open();
    } catch (error) {
        alert("Something went wrong! Please try again.");
        console.log(error);
    }
}