using System.Security.Cryptography;
using System.Text;

namespace RadLeads.Api.Services;

// Encrypts/decrypts strings with AES-GCM (256-bit key).
// Stored format: Base64( nonce[12] + tag[16] + ciphertext )
// Key is read from ENCRYPTION_KEY env var (32-byte Base64 string).
public class EncryptionService
{
    private readonly byte[] _key;

    public EncryptionService(IConfiguration config)
    {
        var raw = config["EncryptionKey"]
            ?? throw new InvalidOperationException("EncryptionKey is not configured.");
        _key = Convert.FromBase64String(raw);
        if (_key.Length != 32)
            throw new InvalidOperationException("EncryptionKey must be a 32-byte Base64 string.");
    }

    public string Encrypt(string plaintext)
    {
        var data = Encoding.UTF8.GetBytes(plaintext);
        var nonce = new byte[AesGcm.NonceByteSizes.MaxSize];   // 12 bytes
        var tag   = new byte[AesGcm.TagByteSizes.MaxSize];     // 16 bytes
        var cipher = new byte[data.Length];

        RandomNumberGenerator.Fill(nonce);

        using var aes = new AesGcm(_key, tag.Length);
        aes.Encrypt(nonce, data, cipher, tag);

        var blob = new byte[nonce.Length + tag.Length + cipher.Length];
        nonce.CopyTo(blob, 0);
        tag.CopyTo(blob, nonce.Length);
        cipher.CopyTo(blob, nonce.Length + tag.Length);

        return Convert.ToBase64String(blob);
    }

    public string Decrypt(string encrypted)
    {
        var blob  = Convert.FromBase64String(encrypted);
        var nonce  = blob[..12];
        var tag    = blob[12..28];
        var cipher = blob[28..];
        var plain  = new byte[cipher.Length];

        using var aes = new AesGcm(_key, tag.Length);
        aes.Decrypt(nonce, cipher, tag, plain);

        return Encoding.UTF8.GetString(plain);
    }
}
