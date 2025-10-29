;; Error codes
(define-constant ERR-INVALID-AMOUNT u100)
(define-constant ERR-STILL-LOCKED u101)
(define-constant ERR-NO-DEPOSIT u102)
(define-constant ERR-UNAUTHORIZED u103)
(define-constant ERR-INSUFFICIENT-BALANCE u104)

(define-data-var lock-period uint u50) ;; default 50 blocks

(define-map deposits
    { user: principal }
    {
        amount: uint,
        deposit-block: uint,
    }
)

;; deposit STX into the vault
(define-public (deposit (amount uint))
    (let ((sender tx-sender))
        (if (<= amount u0)
            (err ERR-INVALID-AMOUNT)
            (begin
                (try! (stx-transfer? amount sender (as-contract tx-sender)))
                (map-set deposits { user: sender } {
                    amount: amount,
                    deposit-block: stacks-block-height,
                })
                (ok amount)
            )
        )
    )
)

;; withdraw STX after lock period
(define-public (withdraw (amount uint))
    (let ((sender tx-sender))
        (let ((deposit-data (map-get? deposits { user: sender })))
            (match deposit-data
                data (let (
                        (user-balance (get amount data))
                        (start (get deposit-block data))
                        (elapsed (- stacks-block-height start))
                    )
                    (if (< elapsed (var-get lock-period))
                        (err ERR-STILL-LOCKED)
                        (if (> amount user-balance)
                            (err ERR-INSUFFICIENT-BALANCE)
                            (begin
                                (try! (as-contract (stx-transfer? amount tx-sender sender)))
                                (if (is-eq amount user-balance)
                                    (map-delete deposits { user: sender })
                                    (map-set deposits { user: sender } {
                                        amount: (- user-balance amount),
                                        deposit-block: start,
                                    })
                                )
                                (ok amount)
                            )
                        )
                    )
                )
                (err ERR-NO-DEPOSIT)
            )
        )
    )
)

;; admin can change lock period
(define-constant admin 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)

(define-public (set-lock-period (new-period uint))
    (begin
        (if (is-eq tx-sender admin)
            (begin
                (var-set lock-period new-period)
                (ok new-period)
            )
            (err ERR-UNAUTHORIZED)
        )
    )
)

;; read-only helper to check deposit info
(define-read-only (get-deposit (user principal))
    (default-to {
        amount: u0,
        deposit-block: u0,
    }
        (map-get? deposits { user: user })
    )
)

;; read-only helper to get user balance
(define-read-only (get-balance (user principal))
    (get amount (get-deposit user))
)
