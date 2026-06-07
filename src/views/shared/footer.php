<?php
// src/views/shared/footer.php
?>
        </div>
    </div>
</div>

<div class="toast-container" id="toast_container"></div>

<?php include __DIR__ . '/modals/modal_confirm.php'; ?>
<?php include __DIR__ . '/modals/modals_global.php'; ?>

<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js">
</script>
<script src="/assets/js/app.js"></script>
<script src="/assets/js/modal_handler.js"></script>
<script src="/assets/js/searchable_select.js"></script>
<?php if (isset($pageJs)): ?>
<script src="/assets/js/<?= htmlspecialchars($pageJs) ?>">
</script>
<?php endif; ?>
<?php if (isset($pageJs2)): ?>
<script src="/assets/js/<?= htmlspecialchars($pageJs2) ?>">
</script>
<?php endif; ?>
</body>
</html>