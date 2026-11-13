package com.myai.my_ai_assistant.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.persistence.EntityManager;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myai.my_ai_assistant.entity.PasswordResetToken;
import com.myai.my_ai_assistant.entity.User;
import com.myai.my_ai_assistant.repository.PasswordResetTokenRepository;
import com.myai.my_ai_assistant.repository.UserRepository;

@Service
public class PasswordResetService {

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final EntityManager entityManager;

    @Value("${app.password-reset.expiration-minutes:15}")
    private long expirationMinutes;

    @Value("${app.password-reset.frontend-url}")
    private String frontendUrl;

    @Value("${app.password-reset.from-email}")
    private String fromEmail;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            JavaMailSender mailSender,
            EntityManager entityManager) {

        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.entityManager = entityManager;
    }

    public void requestPasswordReset(String email) {

        String normalizedEmail = email.trim();

        var userOptional =
                userRepository.findByEmailIgnoreCase(normalizedEmail);

        // Do not reveal whether the email is registered.
        if (userOptional.isEmpty()) {
            return;
        }

        User user = userOptional.get();

        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(tokenHash);
        resetToken.setExpiresAt(
                LocalDateTime.now().plusMinutes(expirationMinutes)
        );

        tokenRepository.save(resetToken);

        String resetLink =
                frontendUrl.replaceAll("/+$", "")
                + "/reset-password?token="
                + rawToken;

        // Send HTML email with clickable reset button.
        sendPasswordResetEmail(
                user.getEmail(),
                user.getUsername(),
                resetLink
        );
    }

    private void sendPasswordResetEmail(
            String email,
            String username,
            String resetLink) {

        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper =
                    new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(email);
            helper.setSubject("MY AI - Reset Your Password");

            String safeUsername = escapeHtml(username);
            String safeResetLink = escapeHtml(resetLink);

            String html = """
                <!DOCTYPE html>
                <html>
                <body style="
                    margin:0;
                    padding:30px 15px;
                    background-color:#f5f5f5;
                    font-family:Arial,sans-serif;
                ">

                  <div style="
                      max-width:520px;
                      margin:0 auto;
                      padding:35px;
                      background-color:#ffffff;
                      border-radius:16px;
                      border:1px solid #e5e5e5;
                  ">

                    <h1 style="
                        text-align:center;
                        color:#111111;
                        font-size:26px;
                        margin-bottom:25px;
                    ">
                      MY AI
                    </h1>

                    <h2 style="
                        color:#111111;
                        font-size:21px;
                    ">
                      Reset Your Password
                    </h2>

                    <p style="
                        color:#333333;
                        font-size:14px;
                        line-height:1.7;
                    ">
                      Hello %s,
                    </p>

                    <p style="
                        color:#555555;
                        font-size:14px;
                        line-height:1.7;
                    ">
                      We received a request to reset your
                      MY AI password.
                    </p>

                    <p style="
                        color:#555555;
                        font-size:14px;
                        line-height:1.7;
                    ">
                      Click the button below to create
                      a new password.
                    </p>

                    <div style="
                        text-align:center;
                        margin:35px 0;
                    ">

                      <a href="%s"
                         style="
                           display:inline-block;
                           padding:15px 30px;
                           background-color:#111111;
                           color:#ffffff;
                           text-decoration:none;
                           font-size:14px;
                           font-weight:bold;
                           border-radius:10px;
                         ">
                        Reset Password
                      </a>

                    </div>

                    <p style="
                        color:#777777;
                        font-size:13px;
                        line-height:1.6;
                    ">
                      This link expires in %d minutes.
                    </p>

                    <p style="
                        color:#777777;
                        font-size:13px;
                        line-height:1.6;
                    ">
                      If you did not request this change,
                      you can safely ignore this email.
                    </p>

                    <hr style="
                        border:none;
                        border-top:1px solid #eeeeee;
                        margin:25px 0;
                    ">

                    <p style="
                        text-align:center;
                        color:#999999;
                        font-size:12px;
                    ">
                      MY AI Team
                    </p>

                  </div>

                </body>
                </html>
                """.formatted(
                    safeUsername,
                    safeResetLink,
                    expirationMinutes
                );

            String plainText =
                    "Hello " + username + ",\n\n"
                    + "We received a request to reset your MY AI password.\n\n"
                    + "Reset your password using this link:\n"
                    + resetLink + "\n\n"
                    + "This link expires in "
                    + expirationMinutes + " minutes.\n\n"
                    + "If you did not request this change, "
                    + "you can ignore this email.\n\n"
                    + "MY AI Team";

            // Plain-text fallback + HTML version.
            helper.setText(plainText, html);

            mailSender.send(message);

        } catch (MessagingException e) {
            throw new IllegalStateException(
                    "Unable to prepare password reset email.", e
            );
        }
    }

    private String escapeHtml(String value) {

        if (value == null) {
            return "";
        }

        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {

        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException(
                    "Invalid or expired reset link."
            );
        }

        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters."
            );
        }

        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = tokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid or expired reset link."
                        )
                );

        Long userId = resetToken.getUser().getUserId();

        // Lock user row to serialize concurrent password resets.
        User user = tokenRepository.lockUserById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Invalid or expired reset link."
                        )
                );

        // Refresh token after acquiring the user row lock.
        entityManager.refresh(resetToken);

        if (resetToken.getUsedAt() != null) {
            throw new IllegalArgumentException(
                    "This reset link has already been used."
            );
        }

        if (!resetToken.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "This reset link has expired."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        // Update password using existing PasswordEncoder.
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Invalidate every unused reset link for this user.
        var unusedTokens =
                tokenRepository.findByUserUserIdAndUsedAtIsNull(userId);

        for (PasswordResetToken token : unusedTokens) {
            token.setUsedAt(now);
        }

        tokenRepository.saveAll(unusedTokens);
    }

    private String hashToken(String rawToken) {

        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    rawToken.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256 algorithm unavailable", e
            );
        }
    }
}
