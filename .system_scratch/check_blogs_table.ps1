$connStr = "Host=localhost;Database=OzikolBccDb;Username=postgres;Password=postgres"
# Let's check columns of Blogs table
try {
    # Check if psql or Npgsql can be queried
    $sql = "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'Blogs' OR table_name = 'blogs' ORDER BY ordinal_position;"
    # Let's check with psql or ef
    Write-Host "Checking Blogs table columns..."
} catch {
    Write-Host "Error: $_"
}
