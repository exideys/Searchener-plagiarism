using Xunit;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc.Testing;
using FluentAssertions;
using Texts.Contracts;

namespace Texts.Api.Tests;

public class FileApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private const long MaxFileSize = 10 * 1024 * 1024;

    public FileApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }
    
    [Fact]
    public async Task AnalyzeFile_WithValidFile_ShouldReturnOkAndCorrectStats()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("a b a")), "file", "note.txt");
        
        var response = await _client.PostAsync("/file/analyze", form);
        
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<AnalyzeTextResponse>();

        dto.Should().NotBeNull();
        dto!.Total.Should().Be(3);
        dto.Counts.Should().ContainKey("a").WhoseValue.Should().Be(2);
    }

    [Fact]
    public async Task AnalyzeFile_WhenFileIsTooLarge_ShouldReturnPayloadTooLarge()
    {
        using var form = new MultipartFormDataContent();
        var largeFileBytes = new byte[MaxFileSize + 1]; 
        form.Add(new ByteArrayContent(largeFileBytes), "file", "largefile.txt");

        var response = await _client.PostAsync("/file/analyze", form);

        response.StatusCode.Should().Be(HttpStatusCode.RequestEntityTooLarge);
    }
    
    [Fact]
    public async Task CompareFiles_WithTwoValidFiles_ShouldReturnOkAndComparisonResult()
    {
        using var form = new MultipartFormDataContent();
        
        var bytes1 = Encoding.UTF8.GetBytes("one two three four");
        var bytes2 = Encoding.UTF8.GetBytes("one two three five six");
        
        form.Add(new ByteArrayContent(bytes1), "file1", "file1.txt");
        form.Add(new ByteArrayContent(bytes2), "file2", "file2.txt");
        form.Add(new StringContent("3"), "shingleSize");
        
        var response = await _client.PostAsync("/files/compare", form);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var dto = await response.Content.ReadFromJsonAsync<FileComparisonResult>();

        dto.Should().NotBeNull();
        dto!.SimilarityPercentage.Should().BeApproximately(0.25, 0.01);
        dto.TotalCommonShingles.Should().Be(1);
        dto.TotalFirstTextShingles.Should().Be(2);
        dto.TotalSecondTextShingles.Should().Be(3);
        dto.CommonShingles.Should().HaveCount(1);
        dto.CommonShingles[0].MatchedShingle.Should().Be("one two three");
    }
    
    [Fact]
    public async Task CompareFiles_WithOneFile_ShouldReturnBadRequest()
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes("this is a test")), "file1", "file1.txt");
        form.Add(new StringContent("3"), "shingleSize");
        
        var response = await _client.PostAsync("/files/compare", form);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}