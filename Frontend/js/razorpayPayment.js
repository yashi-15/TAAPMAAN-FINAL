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
        const response = await fetch("https://api.taapmaan.live/createOrder", {
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
                const user = JSON.parse(localStorage.getItem("userDetails"));
            
                fetch("https://api.taapmaan.live/updatePaymentStatus", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        paymentStatus: "success",
                        orderId: data.order.id,
                        paymentId: response.razorpay_payment_id,
                        upiId: response.razorpay_upi_id,
                        user,
                        amount: data.order.amount / 100,
                    }),
                })
                    .then(() => {
                        // Save payment details in localStorage for receipt generation
                        localStorage.setItem("paymentReceipt", JSON.stringify({
                            orderId: data.order.id,
                            paymentId: response.razorpay_payment_id,
                            upiId: response.razorpay_upi_id,
                            user,
                            amount: data.order.amount / 100,
                        }));
            
                        // Redirect to receipt page
                        window.location.href = "receipt.html";
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

            fetch("https://api.taapmaan.live/updatePaymentStatus", {
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