Fintech wallet

Node Express MySQL Sequelize Redis Bull.

Setup
- copy .env.example to .env
- docker compose up -d --build
- api is running on http://localhost:3000
- phpmyadmin on http://localhost:8080
- postman collection is inside postman folder
- admin login admin@example.com / admin123

Architecture decisions
- app and worker I kept as seperate process
- money and ledger is in mysql only, redis I used only for queue
- flow is routes -> controller -> service, all money related logic is in service only
- whenever balance is changing I am inserting ledger entry, so full history is there
- jwt for normal user, admin token is needed for adding product and approve/reject withdrawal

Transaction handling strategy
- add money, create order and withdrawal request all I am doing in one db transaction
- if any step fail inbetween then whole thing will rollback, wallet will not be half updated
- in ledger I am storing opening and closing available balance of that time

Concurrency handling
- I used row level lock FOR UPDATE, version column is there but I am not using it for locking
- for same user first I lock wallet so 2 order at same time cannot spend same money
- for product I lock by product id in sorted order so overselling and deadlock dono nahi hoga
- 2nd request will wait, after that if balance or stock is not enough then 400

Retry mechanism
- withdrawal job I have kept retry as 3
- if worker crash before commit, mysql will rollback, status still PENDING and money is in locked, job will retry from redis
- if job run again and already PROCESSED then we skip, money will not cut 2nd time
- if 3 time fail then I mark FAILED and locked amount I move back to available

Idempotency implementation
- Idempotency-Key header is required for add money, order and withdrawal request
- I am saving key per user
- same key and same body then I return old response, extra credit debit nahi hoga
- same key but different body then 409
- one user can have only one PENDING or PROCESSING withdrawal at a time

Queue processing approach
- when user request withdrawal, amount go from available to locked, status PENDING, immediately process nahi hota
- when admin approve, I add job in bull, job id is withdrawal id so 2 time approve se 2 job nahi banega
- worker process one job at a time
- job will lock the rows, set PROCESSING, remove locked amount, set PROCESSED, this all in one transaction
- if reject and still PENDING then I remove job if present and move locked back to available, status REJECTED

Additional notes
- logging I did only console (morgan for api and console.log / console.error for worker) due to time limitation
- sql injection sequelize by default handle karta hai because queries go as placeholder, I am not concatenating sql string
