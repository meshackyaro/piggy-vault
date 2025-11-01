;; Error codes
(define-constant ERR-INVALID-AMOUNT u100)
(define-constant ERR-STILL-LOCKED u101)
(define-constant ERR-NO-DEPOSIT u102)
(define-constant ERR-UNAUTHORIZED u103)
(define-constant ERR-INSUFFICIENT-BALANCE u104)
(define-constant ERR-INVALID-LOCK-OPTION u105)

;; Group savings error codes
(define-constant ERR-GROUP-NOT-FOUND u106)
(define-constant ERR-GROUP-FULL u107)
(define-constant ERR-NOT-MEMBER u108)
(define-constant ERR-GROUP-LOCKED u109)
(define-constant ERR-NOT-CREATOR u110)
(define-constant ERR-ALREADY-JOINED u111)
(define-constant ERR-GROUP-NOT-STARTED u112)
(define-constant ERR-INVALID-GROUP-NAME u113)

;; Time-based lock duration constants (converted to blocks)
;; Based on average Stacks block time of 10 minutes per block
(define-constant ONE_HOUR u6) ;; 1 hour = 6 blocks
(define-constant THREE_HOURS u18) ;; 3 hours = 18 blocks
(define-constant SIX_HOURS u36) ;; 6 hours = 36 blocks
(define-constant EIGHT_HOURS u48) ;; 8 hours = 48 blocks
(define-constant ONE_DAY u144) ;; 1 day = 144 blocks
(define-constant FIVE_DAYS u720) ;; 5 days = 720 blocks
(define-constant ONE_WEEK u1008) ;; 1 week = 1,008 blocks
(define-constant TWO_WEEKS u2016) ;; 2 weeks = 2,016 blocks
(define-constant ONE_MONTH u4320) ;; 1 month (30 days) = 4,320 blocks
(define-constant THREE_MONTHS u12960) ;; 3 months (90 days) = 12,960 blocks
(define-constant SIX_MONTHS u25920) ;; 6 months (180 days) = 25,920 blocks
(define-constant NINE_MONTHS u38880) ;; 9 months (270 days) = 38,880 blocks
(define-constant ONE_YEAR u52560) ;; 1 year (365 days) = 52,560 blocks

;; Lock option enumeration
(define-constant LOCK-1-HOUR u1)
(define-constant LOCK-3-HOURS u2)
(define-constant LOCK-6-HOURS u3)
(define-constant LOCK-8-HOURS u4)
(define-constant LOCK-1-DAY u5)
(define-constant LOCK-5-DAYS u6)
(define-constant LOCK-1-WEEK u7)
(define-constant LOCK-2-WEEKS u8)
(define-constant LOCK-1-MONTH u9)
(define-constant LOCK-3-MONTHS u10)
(define-constant LOCK-6-MONTHS u11)
(define-constant LOCK-9-MONTHS u12)
(define-constant LOCK-1-YEAR u13)

;; Individual deposits map (existing functionality)
(define-map deposits
    { user: principal }
    {
        amount: uint,
        deposit-block: uint,
        lock-expiry: uint,
    }
)

;; Group counter for unique group IDs
(define-data-var group-counter uint u0)

;; Group savings data structure
;; Tracks all group information including members, lock status, and timing
(define-map savings-groups
    { group-id: uint }
    {
        creator: principal,
        name: (string-ascii 50),
        duration: uint,
        threshold: (optional uint),
        member-count: uint,
        locked: bool,
        start-block: (optional uint),
        lock-expiry: (optional uint),
    }
)

;; Group membership tracking
;; Maps group-id + member principal to their deposit info
(define-map group-members
    {
        group-id: uint,
        member: principal,
    }
    {
        amount: uint,
        deposit-block: uint,
        joined-block: uint,
    }
)

;; Group member list for easy iteration
;; Stores list of all members for a given group
(define-map group-member-list
    { group-id: uint }
    { members: (list 100 principal) }
)

;; Helper function to convert lock option to block duration
;; Takes a lock option (1-13) and returns the corresponding block count
(define-read-only (get-lock-duration (option uint))
    (if (is-eq option LOCK-1-HOUR)
        ONE_HOUR
        (if (is-eq option LOCK-3-HOURS)
            THREE_HOURS
            (if (is-eq option LOCK-6-HOURS)
                SIX_HOURS
                (if (is-eq option LOCK-8-HOURS)
                    EIGHT_HOURS
                    (if (is-eq option LOCK-1-DAY)
                        ONE_DAY
                        (if (is-eq option LOCK-5-DAYS)
                            FIVE_DAYS
                            (if (is-eq option LOCK-1-WEEK)
                                ONE_WEEK
                                (if (is-eq option LOCK-2-WEEKS)
                                    TWO_WEEKS
                                    (if (is-eq option LOCK-1-MONTH)
                                        ONE_MONTH
                                        (if (is-eq option LOCK-3-MONTHS)
                                            THREE_MONTHS
                                            (if (is-eq option LOCK-6-MONTHS)
                                                SIX_MONTHS
                                                (if (is-eq option LOCK-9-MONTHS)
                                                    NINE_MONTHS
                                                    (if (is-eq option LOCK-1-YEAR)
                                                        ONE_YEAR
                                                        u0 ;; Invalid option returns 0
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    )
)

;; Deposit STX into the vault with time-based lock duration
;; @param amount: Amount of STX to deposit (in microstacks)
;; @param lock-option: Time duration option (1-13, see constants above)
(define-public (deposit
        (amount uint)
        (lock-option uint)
    )
    (let (
            (sender tx-sender)
            (lock-blocks (get-lock-duration lock-option))
        )
        (if (<= amount u0)
            (err ERR-INVALID-AMOUNT)
            (if (is-eq lock-blocks u0)
                (err ERR-INVALID-LOCK-OPTION)
                (begin
                    ;; Transfer STX from user to contract
                    (try! (stx-transfer? amount sender (as-contract tx-sender)))
                    ;; Store deposit information with calculated lock expiry
                    (map-set deposits { user: sender } {
                        amount: amount,
                        deposit-block: stacks-block-height,
                        lock-expiry: (+ stacks-block-height lock-blocks),
                    })
                    (ok amount)
                )
            )
        )
    )
)

;; Withdraw STX after lock period expires
;; @param amount: Amount of STX to withdraw (in microstacks)
(define-public (withdraw (amount uint))
    (let ((sender tx-sender))
        (let ((deposit-data (map-get? deposits { user: sender })))
            (match deposit-data
                data (let (
                        (user-balance (get amount data))
                        (lock-expiry (get lock-expiry data))
                        (deposit-block (get deposit-block data))
                    )
                    ;; Check if lock period has expired
                    (if (< stacks-block-height lock-expiry)
                        (err ERR-STILL-LOCKED)
                        (if (> amount user-balance)
                            (err ERR-INSUFFICIENT-BALANCE)
                            (begin
                                ;; Transfer STX from contract back to user
                                (try! (as-contract (stx-transfer? amount tx-sender sender)))
                                ;; Update or delete deposit record
                                (if (is-eq amount user-balance)
                                    ;; Full withdrawal - delete the record
                                    (map-delete deposits { user: sender })
                                    ;; Partial withdrawal - update the record
                                    (map-set deposits { user: sender } {
                                        amount: (- user-balance amount),
                                        deposit-block: deposit-block,
                                        lock-expiry: lock-expiry,
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

;; Admin functionality (kept for backward compatibility but not used in new system)
;; Note: This admin constant is not used in the current contract logic
;; It's kept for backward compatibility only - can be removed in future versions
(define-constant admin tx-sender) ;; Reset to deployer address for fresh deployment

;; Read-only helper to check complete deposit information
(define-read-only (get-deposit (user principal))
    (default-to {
        amount: u0,
        deposit-block: u0,
        lock-expiry: u0,
    }
        (map-get? deposits { user: user })
    )
)

;; Read-only helper to get user balance
(define-read-only (get-balance (user principal))
    (get amount (get-deposit user))
)

;; Read-only helper to get lock expiry block height for a user
(define-read-only (get-lock-expiry (user principal))
    (get lock-expiry (get-deposit user))
)

;; Read-only helper to check if a user's deposit is currently locked
(define-read-only (is-locked (user principal))
    (let ((expiry (get-lock-expiry user)))
        (and (> expiry u0) (< stacks-block-height expiry))
    )
)

;; Read-only helper to get remaining lock time in blocks
(define-read-only (get-remaining-lock-blocks (user principal))
    (let ((expiry (get-lock-expiry user)))
        (if (and (> expiry u0) (< stacks-block-height expiry))
            (- expiry stacks-block-height)
            u0
        )
    )
)

;; =============================================================================
;; GROUP SAVINGS FUNCTIONALITY
;; =============================================================================

;; Create a new savings group
;; @param name: Group name (max 50 characters)
;; @param lock-option: Time duration option (1-13, same as individual deposits)
;; @param threshold: Optional maximum number of members (none = unlimited)
(define-public (create-group
        (name (string-ascii 50))
        (lock-option uint)
        (threshold (optional uint))
    )
    (let (
            (creator tx-sender)
            (group-id (+ (var-get group-counter) u1))
            (lock-blocks (get-lock-duration lock-option))
        )
        ;; Validate inputs
        (asserts! (> (len name) u0) (err ERR-INVALID-GROUP-NAME))
        (asserts! (<= (len name) u50) (err ERR-INVALID-GROUP-NAME))
        (asserts! (> lock-blocks u0) (err ERR-INVALID-LOCK-OPTION))

        ;; Validate threshold if provided
        (match threshold
            some-threshold (asserts! (and (> some-threshold u0) (<= some-threshold u100))
                (err ERR-INVALID-AMOUNT)
            )
            true
        )

        ;; Create the group
        (map-set savings-groups { group-id: group-id } {
            creator: creator,
            name: name,
            duration: lock-blocks,
            threshold: threshold,
            member-count: u1,
            locked: false,
            start-block: none,
            lock-expiry: none,
        })

        ;; Add creator as first member
        (map-set group-members {
            group-id: group-id,
            member: creator,
        } {
            amount: u0,
            deposit-block: u0,
            joined-block: stacks-block-height,
        })

        ;; Initialize member list with creator
        (map-set group-member-list { group-id: group-id } { members: (list creator) })

        ;; Update group counter
        (var-set group-counter group-id)

        (ok group-id)
    )
)

;; Join an existing savings group
;; @param group-id: ID of the group to join
(define-public (join-group (group-id uint))
    (let (
            (joiner tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (current-members (default-to { members: (list) }
                (map-get? group-member-list { group-id: group-id })
            ))
        )
        ;; Check if group exists and is not locked
        (asserts! (not (get locked group-data)) (err ERR-GROUP-LOCKED))

        ;; Check if user is already a member
        (asserts!
            (is-none (map-get? group-members {
                group-id: group-id,
                member: joiner,
            }))
            (err ERR-ALREADY-JOINED)
        )

        ;; Check if group has space (if threshold is set)
        (match (get threshold group-data)
            some-threshold (asserts! (< (get member-count group-data) some-threshold)
                (err ERR-GROUP-FULL)
            )
            true
        )

        ;; Add member to group
        (map-set group-members {
            group-id: group-id,
            member: joiner,
        } {
            amount: u0,
            deposit-block: u0,
            joined-block: stacks-block-height,
        })

        ;; Update member list
        (let ((updated-members (unwrap!
                (as-max-len? (append (get members current-members) joiner) u100)
                (err ERR-GROUP-FULL)
            )))
            (map-set group-member-list { group-id: group-id } { members: updated-members })
        )

        ;; Update member count and check if threshold reached
        (let ((new-member-count (+ (get member-count group-data) u1)))
            (map-set savings-groups { group-id: group-id }
                (merge group-data { member-count: new-member-count })
            )

            ;; Auto-lock if threshold reached
            (match (get threshold group-data)
                some-threshold (if (>= new-member-count some-threshold)
                    (begin
                        (map-set savings-groups { group-id: group-id }
                            (merge group-data {
                                member-count: new-member-count,
                                locked: true,
                                start-block: (some stacks-block-height),
                                lock-expiry: (some (+ stacks-block-height (get duration group-data))),
                            })
                        )
                        (ok "joined-and-locked")
                    )
                    (ok "joined")
                )
                (ok "joined")
            )
        )
    )
)

;; Manually start the lock for a group (creator only, for groups without threshold)
;; @param group-id: ID of the group to start
(define-public (start-group-lock (group-id uint))
    (let (
            (starter tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
        )
        ;; Only creator can start the lock
        (asserts! (is-eq starter (get creator group-data)) (err ERR-NOT-CREATOR))

        ;; Group must not be locked already
        (asserts! (not (get locked group-data)) (err ERR-GROUP-LOCKED))

        ;; Group must not have a threshold (threshold groups auto-lock)
        (asserts! (is-none (get threshold group-data)) (err ERR-UNAUTHORIZED))

        ;; Start the lock
        (map-set savings-groups { group-id: group-id }
            (merge group-data {
                locked: true,
                start-block: (some stacks-block-height),
                lock-expiry: (some (+ stacks-block-height (get duration group-data))),
            })
        )

        (ok true)
    )
)

;; Deposit STX into a group vault
;; @param group-id: ID of the group
;; @param amount: Amount of STX to deposit (in microstacks)
(define-public (group-deposit
        (group-id uint)
        (amount uint)
    )
    (let (
            (depositor tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (member-data (unwrap!
                (map-get? group-members {
                    group-id: group-id,
                    member: depositor,
                })
                (err ERR-NOT-MEMBER)
            ))
        )
        ;; Validate amount
        (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))

        ;; Group must be locked (started) to accept deposits
        (asserts! (get locked group-data) (err ERR-GROUP-NOT-STARTED))

        ;; Transfer STX from user to contract
        (try! (stx-transfer? amount depositor (as-contract tx-sender)))

        ;; Update member's deposit info
        (map-set group-members {
            group-id: group-id,
            member: depositor,
        }
            (merge member-data {
                amount: (+ (get amount member-data) amount),
                deposit-block: stacks-block-height,
            })
        )

        (ok amount)
    )
)

;; Withdraw STX from a group vault after lock period expires
;; @param group-id: ID of the group
;; @param amount: Amount of STX to withdraw (in microstacks)
(define-public (group-withdraw
        (group-id uint)
        (amount uint)
    )
    (let (
            (withdrawer tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (member-data (unwrap!
                (map-get? group-members {
                    group-id: group-id,
                    member: withdrawer,
                })
                (err ERR-NOT-MEMBER)
            ))
            (lock-expiry (unwrap! (get lock-expiry group-data) (err ERR-GROUP-NOT-STARTED)))
        )
        ;; Validate amount
        (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))

        ;; Check if lock period has expired
        (asserts! (>= stacks-block-height lock-expiry) (err ERR-STILL-LOCKED))

        ;; Check if user has sufficient balance
        (asserts! (>= (get amount member-data) amount)
            (err ERR-INSUFFICIENT-BALANCE)
        )

        ;; Transfer STX from contract back to user
        (try! (as-contract (stx-transfer? amount tx-sender withdrawer)))

        ;; Update member's balance
        (let ((new-amount (- (get amount member-data) amount)))
            (if (is-eq new-amount u0)
                ;; Remove member if balance is zero
                (map-delete group-members {
                    group-id: group-id,
                    member: withdrawer,
                })
                ;; Update member's balance
                (map-set group-members {
                    group-id: group-id,
                    member: withdrawer,
                }
                    (merge member-data { amount: new-amount })
                )
            )
        )

        (ok amount)
    )
)

;; =============================================================================
;; GROUP SAVINGS READ-ONLY FUNCTIONS
;; =============================================================================

;; Get group information
(define-read-only (get-group (group-id uint))
    (map-get? savings-groups { group-id: group-id })
)

;; Get member information for a specific group
(define-read-only (get-group-member
        (group-id uint)
        (member principal)
    )
    (map-get? group-members {
        group-id: group-id,
        member: member,
    })
)

;; Get all members of a group
(define-read-only (get-group-members (group-id uint))
    (default-to { members: (list) }
        (map-get? group-member-list { group-id: group-id })
    )
)

;; Get member's balance in a group
(define-read-only (get-group-balance
        (group-id uint)
        (member principal)
    )
    (match (map-get? group-members {
        group-id: group-id,
        member: member,
    })
        some-data (get amount some-data)
        u0
    )
)

;; Check if a group's lock has expired
(define-read-only (is-group-unlocked (group-id uint))
    (match (map-get? savings-groups { group-id: group-id })
        some-group (match (get lock-expiry some-group)
            some-expiry (>= stacks-block-height some-expiry)
            false
        )
        false
    )
)

;; Get remaining lock time for a group in blocks
(define-read-only (get-group-remaining-blocks (group-id uint))
    (match (map-get? savings-groups { group-id: group-id })
        some-group (match (get lock-expiry some-group)
            some-expiry (if (< stacks-block-height some-expiry)
                (- some-expiry stacks-block-height)
                u0
            )
            u0
        )
        u0
    )
)

;; Get current group counter (total number of groups created)
(define-read-only (get-group-counter)
    (var-get group-counter)
)

;; Check if user is a member of a group
(define-read-only (is-group-member
        (group-id uint)
        (member principal)
    )
    (is-some (map-get? group-members {
        group-id: group-id,
        member: member,
    }))
)
