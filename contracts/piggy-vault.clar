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
            (err u100) ;; invalid amount
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
                data
                (let (
                        (user-balance (get amount data))
                        (start (get deposit-block data))
                        (elapsed (- stacks-block-height start))
                    )
                    (if (< elapsed (var-get lock-period))
                        (err u101) ;; still locked
                        (if (> amount user-balance)
                            (err u104) ;; insufficient balance
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
                (err u102) ;; no deposit found
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
            (err u103) ;; unauthorized
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
